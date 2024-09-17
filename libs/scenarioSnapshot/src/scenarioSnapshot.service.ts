// import { autoRun, foreachInRepo, withTransaction } from "@app/commons";
// import { CkbTxStatus, actionGroupStatus, actionGroup } from "@app/schemas";
import { getTokenBalance } from "@app/commons";
import { ExecuteService } from "@app/execute";
import { ScenarioSnapshot } from "@app/schemas";
import { ccc } from "@ckb-ccc/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HDKey } from "@scure/bip32";
import { Client, Collector, PoolInfo, Token } from "@utxoswap/swap-sdk-js";
import { Axios } from "axios";
import { StrategyService } from "libs/strategy/src";
import { CMMWallet } from "parameters";
import { tokenRegistry } from "parameters/tokenRegistry";
import { walletRegistry } from "parameters/walletRegistry";
import { EntityManager } from "typeorm";
import {
  ActionGroupStatus,
  PoolSnapshot,
  ScenarioSnapshotStatus,
  WalletStatus,
} from "../../schemas/src/schemas/scenarioSnapshot.schema";
import { CkbTxRepo, ScenarioSnapshotRepo } from "./repos";

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
  private temporaryWallets: CMMWallet[] = [];
  private readonly strategyService: StrategyService;
  private readonly executeService: ExecuteService;

  constructor(
    configService: ConfigService,
    strategyService: StrategyService,
    executeService: ExecuteService,
    private readonly entityManager: EntityManager,
    private readonly ckbTxRepo: CkbTxRepo,
    private readonly scenarioSnapshotRepo: ScenarioSnapshotRepo,
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
    this.strategyService = strategyService;
    this.executeService = executeService;
  }

  async main(): Promise<void> {
    const latestScenarioSnapshot = await this.getLatestScenarioSnapshot();
    this.strategyService.generateActions(latestScenarioSnapshot);
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

    const tokenList = tokenRegistry.map((token) => token.symbol);

    /* Get PoolInfos and store poolSnapshots */
    tokenRegistry.forEach(async (token) => {
      const { list: pools } = await this.UTXOSwapClient.getPoolsByToken({
        pageNo: 0,
        pageSize: 10,
        searchKey: token.typeHash,
      });
      for (const pool of pools) {
        if (
          pool.assetY.symbol == token.symbol ||
          !tokenList.includes(pool.assetY.symbol)
        ) {
          // Note: Only store the pool with the current token as assetX. Ignore all pools with assetY not included in the tokenRegistry.
          continue;
        }
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
        poolInfos.push(pool);
      }
    });

    /* Finalize */
    const latestScenarioSnapshot: ScenarioSnapshot = {
      timestamp,
      ScenarioSnapshotStatus: ScenarioSnapshotStatus.Stored,
      walletStatuses,
      poolSnapshots,
      poolInfos,
      actions: [],
      actionGroupStatus: ActionGroupStatus.NotStarted,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return latestScenarioSnapshot;
  }

  async syncScenarioSnapshot(
    scenarioSnapshot: ScenarioSnapshot,
  ): Promise<void> {
    // TODO: implement
    console.log(scenarioSnapshot);
    return;
  }
}
