import { transactionFormatter } from "@app/commons";
import { Action, ActionStatus } from "@app/schemas";
import { ccc, TransactionLike } from "@ckb-ccc/core";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
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
  if (pool.tokens[1].symbol !== "CKB") {
    action.actionStatus = ActionStatus.Failed;
    throw new Error("Only CKB to Token swap is supported for now");
  }
  if (action.actionStatus === ActionStatus.NotStarted) {
    try {
      for (const target of action.targets) {
        if (target.assetXSymbol !== target.assetYSymbol) {
          action.actionStatus = ActionStatus.Failed;
          throw new Error(
            `executeSwapCKBtoToken Action #${action.actionID} | AssetX and AssetY must be the same for transfer action`,
          );
        }
        if (action.actorAddress === target.targetAddress) {
          action.actionStatus = ActionStatus.Failed;
          throw new Error(
            `executeSwapCKBtoToken Action #${action.actionID} | Actor and target addresses must be different for transfer action`,
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
      const actorRootKey = HDKey.fromMasterSeed(
        mnemonicToSeedSync(actorWallet.mnemonic),
      );
      const key = actorRootKey.derive(`${executeService.pathPrefix}0`);
      if (!key.privateKey) {
        action.actionStatus = ActionStatus.Failed;
        throw Error(
          `executeSwapCKBtoToken Action #${action.actionID} | Failed to derive key`,
        );
      }
      const signer = new ccc.SignerCkbPrivateKey(
        executeService.CKBClient,
        key.privateKey,
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
