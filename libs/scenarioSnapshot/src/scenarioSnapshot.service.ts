// import { autoRun, foreachInRepo, withTransaction } from "@app/commons";
// import { CkbTxStatus, actionGroupStatus, actionGroup } from "@app/schemas";
import { getTokenBalance } from "@app/commons";
import { ScenarioSnapshot } from "@app/schemas";
import { ccc } from "@ckb-ccc/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HDKey } from "@scure/bip32";
import { Client, Collector, PoolInfo, Token } from "@utxoswap/swap-sdk-js";
import { Axios } from "axios";
import { tokenRegistry } from "parameters/tokenRegistry";
import { walletRegistry } from "parameters/walletRegistry";
import { EntityManager } from "typeorm";
import {
  PoolSnapshot,
  ScenarioSnapshotStatus,
  WalletStatus,
} from "../../schemas/src/schemas/scenarioSnapshot.schema";
import { ActionGroupRepo, CkbTxRepo } from "./repos";

@Injectable()
export class ScenarioSnapshotService {
  private readonly logger = new Logger(ScenarioSnapshotService.name);
  private readonly requester: Axios;
  private readonly CKBClient: ccc.Client;
  private readonly UTXOSwapClient: Client;
  private readonly rootKey: HDKey;
  private readonly pathPrefix: string;
  private readonly feeRate: number;
  private readonly collector: Collector;
  private readonly tokenRegistry: Token[] = tokenRegistry;

  constructor(
    configService: ConfigService,
    private readonly entityManager: EntityManager,
    private readonly ckbTxRepo: CkbTxRepo,
    private readonly actionGroupRepo: ActionGroupRepo,
  ) {
    const ckbRpcUrl = configService.get<string>("send.ckb_rpc_url");
    const ckbIndexerUrl = configService.get<string>("execute.ckbIndexerUrl");
    if (ckbIndexerUrl === undefined) {
      throw Error("Empty ckbIndexerUrl");
    }
    this.CKBClient = configService.get<boolean>("is_mainnet")
      ? new ccc.ClientPublicMainnet({ url: ckbRpcUrl })
      : new ccc.ClientPublicTestnet({ url: ckbRpcUrl });
    this.collector = new Collector({ ckbIndexerUrl });
  }

  async getLatestScenarioSnapshot(): Promise<ScenarioSnapshot> {
    const timestamp: number = Math.floor(Date.now() / 1000);
    const poolInfos: PoolInfo[] = [];
    const poolSnapshots: PoolSnapshot[] = [];
    const walletStatuses: WalletStatus[] = [];
    /* Get PoolInfos and store poolSnapshots */
    tokenRegistry.forEach(async (token) => {
      const { list: pools } = await this.UTXOSwapClient.getPoolsByToken({
        pageNo: 0,
        pageSize: 10,
        searchKey: token.typeHash,
      });
      poolInfos.push(...pools);
      pools.forEach((pool) => {
        const poolSnapshot: PoolSnapshot = {
          assetXSymbol: pool.assetX.symbol,
          assetYSymbol: pool.assetY.symbol,
          basedAsset: pool.basedAsset,
          batchId: pool.batchId,
          feeRate: pool.feeRate,
          protocolLpAmount: pool.protocolLpAmount,
          totalLpSupply: pool.totalLpSupply,
          typeHash: pool.typeHash,
          poolShare: pool.poolShare,
          LPToken: pool.LPToken,
          tvl: pool.tvl,
          dayTxsCount: pool.dayTxsCount,
          dayVolume: pool.dayVolume,
          dayApr: pool.dayApr,
        };
        poolSnapshots.push(poolSnapshot);
      });
    });

    /* Get WalletStatuses */

    walletRegistry.forEach((wallet) => {
      const walletStatus: WalletStatus = {
        address: wallet.address,
        balances: [],
      };
      /* Enumerate and Get Balances */
      tokenRegistry.forEach(async (token) => {
        const type = token.typeScript;
        walletStatus.balances.push({
          symbol: token.symbol,
          balance: await getTokenBalance(this.collector, wallet.address, type),
        });
      });
      walletStatuses.push(walletStatus);
    });

    const latestScenarioSnapshot: ScenarioSnapshot = {
      timestamp,
      ScenarioSnapshotStatus: ScenarioSnapshotStatus.Stored,
      walletStatuses,
      poolSnapshots,
      poolInfos,
    };
    return latestScenarioSnapshot;
  }

  // async checkActionGroups() {
  //   const { data: blockNumber } =
  //     await this.requester.get("/blocks/tip/height");
  //   if (typeof blockNumber !== "number") {
  //     this.logger.error(`Invalid block number: ${blockNumber}`);
  //     return;
  //   }

  //   await foreachInRepo({
  //     repo: this.actionGroupRepo,
  //     criteria: {
  //       blockNumber: LessThanOrEqual(blockNumber),
  //       status: Or(Equal(actionGroupStatus.Saved), Equal(actionGroupStatus.TxCreated)),
  //     },
  //     isSerial: true,
  //     handler: async (actionGroup) => {
  //       switch (actionGroup.status) {
  //         case actionGroupStatus.TxCreated:
  //           if (!(await this.handleTxCreatedActionGroup(actionGroup))) {
  //             return;
  //           }
  //         // Fallthrough to recreate failed tx
  //         case actionGroupStatus.Saved: {
  //           if (!(await this.handleSavedActionGroup(actionGroup))) {
  //             return;
  //           }
  //           break;
  //         }
  //         default: {
  //           throw new Error(`Unknown actionGroup ${actionGroup.id} status ${status}`);
  //         }
  //       }
  //     },
  //   });
  // }

  // async handleTxCreatedActionGroup(actionGroup: actionGroup): Promise<boolean> {
  //   if (!actionGroup.txHash) {
  //     this.logger.error(`Unexpected empty tx hash for actionGroup ${actionGroup.id}`);
  //     return false;
  //   }

  //   const tx = await this.ckbTxRepo.findTxByHash(actionGroup.txHash);
  //   if (!tx) {
  //     this.logger.error(`Tx with hash ${actionGroup.txHash} not found`);
  //     return false;
  //   }

  //   if (tx.status === CkbTxStatus.Failed) {
  //     this.logger.error(`actionGroup ${actionGroup.id} failed.`);
  //     await this.Repo.updateStatus(actionGroup, actionGroupStatus.Saved);
  //     await this.client.cache.clear();
  //     return true;
  //   } else if (tx.status === CkbTxStatus.Confirmed) {
  //     this.logger.log(`actionGroup ${actionGroup.id} finished.`);
  //     await this.actionGroupRepo.updateStatus(actionGroup, actionGroupStatus.Finished);
  //     return false;
  //   } else {
  //     return false;
  //   }
  // }

  // async handleSavedActionGroup(actionGroup: actionGroup): Promise<boolean> {
  //   const key = this.rootKey.derive(`${this.pathPrefix}0`);
  //   if (!key.privateKey) {
  //     throw Error("Failed to derive key");
  //   }
  //   const signer = new ccc.SignerCkbPrivateKey(this.client, key.privateKey);
  //   const sendAddress = await signer.getRecommendedAddress();
  //   const { script: change } = await signer.getRecommendedAddressObj();

  //   const type = ccc.Script.from(JSON.parse(actionGroup.rawType));

  //   const tx = ccc.Transaction.from({
  //     outputs: [
  //       {
  //         lock: (await ccc.Address.fromString(actionGroup.address, this.client))
  //           .script,
  //         type,
  //       },
  //     ],
  //     outputsData: [ccc.numLeToBytes(actionGroup.amount, 16)],
  //   });
  //   await tx.addCellDepsOfKnownScripts(this.client, ccc.KnownScript.XUdt);

  //   await tx.completeInputsByUdt(signer, type);
  //   const balanceDiff =
  //     (await tx.getInputsUdtBalance(signer.client, type)) -
  //     tx.getOutputsUdtBalance(type);
  //   if (balanceDiff > ccc.Zero) {
  //     tx.addOutput(
  //       {
  //         lock: change,
  //         type,
  //       },
  //       ccc.numLeToBytes(balanceDiff, 16),
  //     );
  //   }
  //   await tx.completeInputsByCapacity(signer);
  //   await tx.completeFeeBy(signer, this.feeRate);
  //   const signedTx = await signer.signTransaction(tx);
  //   const txHash = signedTx.hash();
  //   await this.client.cache.markTransactions(signedTx);

  //   this.logger.log(
  //     `Sending actionGroup ${actionGroup.id}, from ${sendAddress} amount ${actionGroup.amount} hash ${type.hash()} to ${actionGroup.address}, tx hash ${txHash}`,
  //   );

  //   await withTransaction(this.entityManager, undefined, async (manager) => {
  //     const actionGroupRepo = new actionGroupRepo(manager);
  //     const ckbTxRepo = new CkbTxRepo(manager);

  //     const rawTx = tx.stringify();
  //     await actionGroupRepo.updateTxHash(actionGroup, txHash);
  //     await ckbTxRepo.save({
  //       txHash,
  //       rawTx,
  //       status: CkbTxStatus.Prepared,
  //     });
  //   });
  //   return true;
  // }
}
