import { transactionFormatter } from "@app/commons";
import { Action, ActionStatus } from "@app/schemas";
import { ccc, TransactionLike } from "@ckb-ccc/core";
import { Pool } from "@utxoswap/swap-sdk-js";
import { walletRegistry } from "parameters/walletRegistry";
import { ExecuteService } from "..";

export async function executeSwap(
  executeService: ExecuteService,
  action: Action,
  pool: Pool,
  slippage: string,
): Promise<ActionStatus> {
  executeService.logger.verbose(`executeSwap Action | Started`);
  for (const target of action.targets) {
    executeService.logger.verbose(
      `== ${target.amount} Units of ${target.originalAssetSymbol} to ${target.targetAddress} `,
    );
  }
  // TODO: Limiting swapping to only one token per action for now. Might implement multiple token swaps in one action in the future.
  if (action.actionStatus === ActionStatus.NotStarted) {
    try {
      for (const target of action.targets) {
        if (target.originalAssetSymbol === target.targetAssetSymbol) {
          action.actionStatus = ActionStatus.Failed;
          throw new Error(
            `executeSwap Action | AssetX and AssetY must be different for swap action`,
          );
        }
        if (action.actorAddress !== target.targetAddress) {
          action.actionStatus = ActionStatus.Failed;
          throw new Error(
            `executeSwap Action | Actor and target addresses must be the same for swap action`,
          );
        }
      }

      const actorWallet = walletRegistry.find(
        (wallet) => wallet.address === action.actorAddress,
      );
      if (!actorWallet) {
        action.actionStatus = ActionStatus.Failed;
        throw new Error(
          `executeSwap Action | Actor wallet ${action.actorAddress} not found`,
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
      //     `executeSwap Action #${action.actionID} | Failed to derive key`,
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
      const signTxFunc = async (rawTx: CKBComponents.RawTransactionToSign) => {
        const txLike = await signer!.signTransaction(rawTx as TransactionLike);
        return transactionFormatter(txLike);
      };
      const intentTxHash = await pool.swapWithExactInput(
        signTxFunc,
        slippage,
        5000,
      );
      if (!intentTxHash) {
        action.actionStatus = ActionStatus.Failed;
        throw new Error(`executeSwap Action | Failed to obtain intent tx hash`);
      } else {
        action.txHash = intentTxHash;
        action.actionStatus = ActionStatus.IntentSent;
      }
    } catch (e: any) {
      action.actionStatus = ActionStatus.Failed;
      executeService.logger.error(
        `executeSwap Action #${action.actionID} | Failed in try catch:${e.message}`,
        e.stack,
      );
      throw e;
    }
  }

  if (action.actionStatus === ActionStatus.IntentSent) {
    const getTransactionResponse =
      await executeService.CKBClient.getTransaction(action.txHash);
    executeService.logger.verbose(
      `executeSwap Action | GetTransactionResponse: ${JSON.stringify(
        getTransactionResponse?.status,
      )}`,
    );
    switch (getTransactionResponse?.status) {
      case "sent":
      case "pending":
      case "proposed":
      case undefined:
        break;
      case "committed":
        action.actionStatus = ActionStatus.Committed;
        break;
      case "rejected":
      case "unknown":
        action.actionStatus = ActionStatus.Failed;
        break;
      default:
        executeService.logger.error(
          `executeSwap Action | Unknown status: ${getTransactionResponse?.status}`,
        );
        break;
    }
  }

  if (action.actionStatus === ActionStatus.Committed) {
    switch (
      await executeService.CKBClient.getCellLive(
        { txHash: action.txHash, index: 0 },
        false,
        true,
      )
    ) {
      case undefined:
        action.actionStatus = ActionStatus.IntentConsumed;
        break;
      default:
        break;
    }
  }

  if (action.actionStatus === ActionStatus.IntentConsumed) {
    await executeService.actionRepo.save(action);
    await executeService.actionRepo.updateStatus(action, ActionStatus.Stored);
    action.actionStatus = (await executeService.actionRepo.findOneBy({
      actionID: action.actionID,
    }))!.actionStatus;
  }
  executeService.logger.debug(
    `executeSwap Action | Action TxHash: ${action.txHash === undefined ? "N/A" : action.txHash}; Action Status: ${action.actionStatus}`,
  );
  return action.actionStatus;
}
