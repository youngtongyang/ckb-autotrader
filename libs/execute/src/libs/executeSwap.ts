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
  // TODO: Limiting swapping to only one token per action for now. Might implement multiple token swaps in one action in the future.
  if (action.actionStatus === ActionStatus.NotStarted) {
    try {
      for (const target of action.targets) {
        if (target.assetXSymbol === target.assetYSymbol) {
          action.actionStatus = ActionStatus.Failed;
          throw new Error(
            `executeSwapCKBtoToken Action #${action.actionID} | AssetX and AssetY must be different for swap action`,
          );
        }
        if (action.actorAddress !== target.targetAddress) {
          action.actionStatus = ActionStatus.Failed;
          throw new Error(
            `executeSwapCKBtoToken Action #${action.actionID} | Actor and target addresses must be the same for swap action`,
          );
        }
      }

      const actorWallet = walletRegistry.find(
        (wallet) => wallet.address === action.actorAddress,
      );
      if (!actorWallet) {
        action.actionStatus = ActionStatus.Failed;
        throw new Error(
          `executeSwapCKBtoToken Action #${action.actionID} | Actor wallet ${action.actorAddress} not found`,
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
      //     `executeSwapCKBtoToken Action #${action.actionID} | Failed to derive key`,
      //   );
      // }
      if (!actorWallet.privateKey) {
        action.actionStatus = ActionStatus.Failed;
        throw new Error(
          `executeTransfer Action #${action.actionID} | Actor wallet ${action.actorAddress} has no private key`,
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
        throw new Error(
          `executeSwapCKBtoToken Action #${action.actionID} | Failed to obtain intent tx hash`,
        );
      } else {
        action.txHash = intentTxHash;
        action.actionStatus = ActionStatus.IntentCreationSent;
      }
    } catch (e: any) {
      action.actionStatus = ActionStatus.Failed;
      executeService.logger.error(
        `executeSwapCKBtoToken Action #${action.actionID} | Failed in try catch:${e.message}`,
        e.stack,
      );
      throw e;
    }
  }
  if (action.actionStatus === ActionStatus.IntentCreationSent) {
    // TODO: Implement checking for intent tx status
  }
  return action.actionStatus;
}
