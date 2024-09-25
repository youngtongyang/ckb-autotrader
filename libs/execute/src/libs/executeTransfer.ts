import { bytesFromAnyString } from "@app/commons";
import { Action, ActionStatus } from "@app/schemas";
import { ccc, CellDepLike } from "@ckb-ccc/core";
import { walletRegistry } from "parameters/walletRegistry";
import { ExecuteService } from "../execute.service";
export async function executeTransfer(
  executeService: ExecuteService,
  action: Action,
): Promise<ActionStatus> {
  executeService.logger.debug(`executeTransfer Action | Start`);
  executeService.logger.verbose(
    `executeTransfer Action | Action TxHash: ${action.txHash}; Action Status: ${action.actionStatus}`,
  );
  for (const target of action.targets) {
    executeService.logger.verbose(
      `== ${target.amount} Units of ${target.assetXSymbol} to ${target.targetAddress} `,
    );
  }
  let signedTx: any;
  if (
    [ActionStatus.Aborted, ActionStatus.Failed, ActionStatus.Stored].includes(
      action.actionStatus,
    )
  ) {
    return action.actionStatus;
  }

  if (action.actionStatus === ActionStatus.NotStarted) {
    for (const [index, target] of action.targets.entries()) {
      if (target.assetXSymbol !== target.assetYSymbol) {
        action.actionStatus = ActionStatus.Failed;
        throw new Error(
          `executeTransfer Action #${index} | AssetX and AssetY must be the same for transfer action`,
        );
      }
      if (action.actorAddress === target.targetAddress) {
        action.actionStatus = ActionStatus.Failed;
        throw new Error(
          `executeTransfer Action #${index} | Actor and target addresses must be different for transfer action`,
        );
      }
    }

    const actorWallet = walletRegistry.find(
      (wallet) => wallet.address === action.actorAddress,
    );
    if (!actorWallet) {
      action.actionStatus = ActionStatus.Failed;
      throw new Error(
        `executeTransfer Action | Actor wallet ${action.actorAddress} not found`,
      );
    }
    // TODO: Implement importing from mnemonic
    // const actorRootKey = HDKey.fromMasterSeed(
    //   mnemonicToSeedSync(actorWallet.mnemonic),
    // );
    // const key = actorRootKey.derive(`${executeService.pathPrefix}0`);
    // if (!key.privateKey) {
    //   action.actionStatus = ActionStatus.Failed;
    //   throw Error(
    //     `executeTransfer Action #${action.actionID} | Failed to derive key`,
    //   );
    // }
    if (!actorWallet.privateKey) {
      action.actionStatus = ActionStatus.Failed;
      throw new Error(
        `executeTransfer Action | Actor wallet ${action.actorAddress} has no private key`,
      );
    }
    const signer = new ccc.SignerCkbPrivateKey(
      executeService.CKBClient,
      actorWallet.privateKey,
    );
    const recommendedActorAddress = await signer.getRecommendedAddress();
    const { script: changeLock } = await signer.getRecommendedAddressObj();
    const outputsPromises = action.targets.map(async (target) => {
      const lock = await ccc.Address.fromString(
        target.targetAddress,
        executeService.CKBClient,
      );
      return {
        lock: lock.script,
        type: executeService.symbolToScriptBuffer[target.assetXSymbol]?.script,
        capacity: target.assetXSymbol === "CKB" ? target.amount : undefined,
      };
    });
    const outputs = await Promise.all(outputsPromises);
    const outputsData = action.targets.map((target) => {
      if (target.assetXSymbol === "CKB") {
        return bytesFromAnyString("");
      } else {
        return ccc.numLeToBytes(target.amount, 16);
      }
    });
    const tx = ccc.Transaction.from({
      outputs,
      outputsData,
    });
    await tx.addCellDepsOfKnownScripts(
      executeService.CKBClient,
      ccc.KnownScript.XUdt,
    );
    for (const target of action.targets) {
      const cellDep =
        executeService.symbolToScriptBuffer[target.assetXSymbol]?.cellDep;
      if (cellDep !== undefined) {
        tx.addCellDeps(cellDep as CellDepLike);
      }
    }
    for (const tokenSymbol of Object.keys(
      executeService.symbolToScriptBuffer,
    )) {
      const type = executeService.symbolToScriptBuffer[tokenSymbol]?.script;
      if (type == undefined) {
        continue;
      }
      await tx.completeInputsByUdt(signer, type);
      const balanceDiff =
        (await tx.getInputsUdtBalance(signer.client, type)) -
        tx.getOutputsUdtBalance(type);
      if (balanceDiff > ccc.Zero) {
        tx.addOutput(
          {
            lock: changeLock,
            type,
          },
          ccc.numLeToBytes(balanceDiff, 16),
        );
      }
    }

    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer, executeService.feeRate);

    signedTx = await signer.signTransaction(tx);
    action.txHash = signedTx.hash();
    await executeService.CKBClient.cache.markTransactions(signedTx);
    action.rawTx = tx.stringify();
    executeService.logger.log(
      `executeTransfer | Sending tokens from ${recommendedActorAddress} in Transaction, tx hash ${action.txHash}`,
    );
    for (const target of action.targets) {
      executeService.logger.log(
        `== ${target.amount} to ${target.targetAddress} `,
      );
    }
    action.actionStatus = ActionStatus.TxCreated;
  }

  if (action.actionStatus === ActionStatus.TxCreated) {
    if (signedTx === undefined) {
      const getTransactionResponse =
        await executeService.CKBClient.getTransaction(action.txHash);
      if (!getTransactionResponse || getTransactionResponse.status === "sent") {
        signedTx = ccc.Transaction.from(JSON.parse(action.rawTx));
        try {
          await executeService.CKBClient.sendTransaction(
            signedTx,
            "passthrough",
          );
        } catch (e: any) {
          executeService.logger.error(
            `executeTransfer Action | Action with hash ${action.txHash} failed to send.`,
            e.message,
          );
          if (
            e instanceof ccc.ErrorClientVerification ||
            e instanceof ccc.ErrorClientRBFRejected
          ) {
            executeService.logger.error(
              `Action with hash ${action.txHash} failed to pass verification.`,
              e.message,
            );
            await executeService.actionRepo.updateStatus(
              action,
              ActionStatus.Failed,
            );
            return ActionStatus.Failed;
          }

          if (e instanceof ccc.ErrorClientResolveUnknown) {
            const previousAction = await executeService.actionRepo.findTxByHash(
              e.outPoint.txHash,
            );
            const isDead = await (async () => {
              try {
                return (
                  (await executeService.CKBClient.getCell(e.outPoint)) &&
                  !(await executeService.CKBClient.getCellLive(
                    e.outPoint,
                    false,
                  ))
                );
              } catch (err) {
                return false;
              }
            })();
            if (
              previousAction &&
              previousAction.actionStatus !== ActionStatus.Failed &&
              !isDead
            ) {
              executeService.logger.warn(
                `executeTransfer Action | Action with with hash ${action.txHash} is waiting for previous action with hash ${previousAction.txHash}.`,
              );
              return action.actionStatus;
            } else {
              executeService.logger.error(
                `executeTransfer Action | Action with hash ${action.txHash} failed by using unknown out point. ${e.outPoint.txHash}:${e.outPoint.index.toString()}`,
              );
              action.actionStatus = ActionStatus.Failed;
              await executeService.actionRepo.updateStatus(
                action,
                ActionStatus.Failed,
              );
              return action.actionStatus;
            }
          }

          if (e instanceof ccc.ErrorClientDuplicatedTransaction) {
            // It has been sent?
          } else {
            // TODO: The error might not be parsed properly here. Read the actual error message. Should improve here.
            action.actionStatus = ActionStatus.Failed;
            throw new Error(
              `executeTransfer Action | Action with hash ${action.txHash} has been submitted the second time. This should not happen.`,
            );
          }
        }
      }
    }
    action.actionStatus = ActionStatus.TransferSent;
    executeService.logger.log(
      `executeTransfer Action | Transfer transaction ${action.txHash} has been sent`,
    );
  }
  if (action.actionStatus === ActionStatus.TransferSent) {
    const getTransactionResponse =
      await executeService.CKBClient.getTransaction(action.txHash);
    executeService.logger.verbose(
      `executeTransfer Action | Action with hash ${action.txHash} status is ${getTransactionResponse?.status}`,
    );
    // TODO: The error might not be delivered and stuck at the "sent" stage. You might need to send the transaction again to get the error.
    // TODO: Also, the error might not be caught properly based on the current implementation. Need to improve.
    if (!getTransactionResponse || getTransactionResponse.status === "sent") {
      if (Date.now() - action.updatedAt.getTime() >= 120000) {
        executeService.logger.error(
          `executeTransfer Action | Action with hash ${action.txHash} rearranged by not found.`,
        );
        action.actionStatus = ActionStatus.TxCreated;
        return action.actionStatus;
      }
      if (
        getTransactionResponse &&
        getTransactionResponse.blockNumber === undefined
      ) {
        if (Date.now() - action.updatedAt.getTime() >= 600000) {
          executeService.logger.error(
            `executeTransfer Action | Action with hash ${action.txHash} rearranged by not committed`,
          );
          action.actionStatus = ActionStatus.TxCreated;
          return action.actionStatus;
        }
      } else {
        action.actionStatus = ActionStatus.Committed;
        executeService.logger.log(
          `executeTransfer Action | Action with hash ${action.txHash} committed`,
        );
      }
    }
  }
  if (action.actionStatus === ActionStatus.Committed) {
    const getTransactionResponse =
      await executeService.CKBClient.getTransaction(action.txHash);
    if (
      !getTransactionResponse ||
      getTransactionResponse.blockNumber === undefined
    ) {
      executeService.logger.error(
        `executeTransfer Action | Action with hash ${action.txHash} rearranged by not found.`,
      );
      action.actionStatus = ActionStatus.TxCreated;
      return action.actionStatus;
    }

    if (getTransactionResponse.status === "rejected") {
      action.actionStatus = ActionStatus.Failed;
      executeService.logger.error(
        `executeTransfer Action | Action with hash ${action.txHash} failed ${getTransactionResponse.reason}.`,
      );
      return action.actionStatus;
    }

    const tip = await executeService.CKBClient.getTip();
    if (tip - getTransactionResponse.blockNumber < ccc.numFrom(24)) {
      return action.actionStatus;
    }

    action.actionStatus = ActionStatus.Confirmed;
    executeService.logger.log(
      `executeTransfer Action #${action.actionID} | Action with hash ${action.txHash} confirmed`,
    );
  }

  if (action.actionStatus === ActionStatus.Confirmed) {
    action.actionStatus = ActionStatus.Stored;
    await executeService.actionRepo.save(action);
    executeService.logger.log(
      `executeTransfer Action #${action.actionID} | Action with hash ${action.txHash} stored`,
    );
    return action.actionStatus;
  }

  return action.actionStatus;
}
