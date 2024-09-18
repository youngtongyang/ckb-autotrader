// import { autoRun, foreachInRepo, withTransaction } from "@app/commons";
// import { CkbTxStatus, actionGroupStatus, actionGroup } from "@app/schemas";
import { autoRun, getTokenBalance } from "@app/commons";
import { ExecuteService } from "@app/execute";
import { ActionRepo } from "@app/execute/repos";
import { ScenarioSnapshot } from "@app/schemas";
import { StrategyService } from "@app/strategy";
import { ccc } from "@ckb-ccc/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HDKey } from "@scure/bip32";
import { Client, Collector, PoolInfo, Token } from "@utxoswap/swap-sdk-js";
import { Axios } from "axios";
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
import { ScenarioSnapshotRepo } from "./repos";

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

  constructor(
    configService: ConfigService,
    private executeService: ExecuteService,
    private strategyService: StrategyService,
    private readonly entityManager: EntityManager,
    private readonly actionRepo: ActionRepo,
    private readonly scenarioSnapshotRepo: ScenarioSnapshotRepo,
  ) {
    this.logger.verbose("ScenarioSnapshotService.constructor | started");
    const ckbRpcUrl = configService.get<string>("common.ckb_rpc_url");
    const ckbIndexerUrl = configService.get<string>("common.ckbIndexerUrl");
    if (ckbIndexerUrl === undefined) {
      throw Error("Empty ckbIndexerUrl");
    }
    const UTXOSwapApiKey = configService.get<string>("common.UTXOSwapApiKey");
    const isMainnet = configService.get<boolean>("is_mainnet");
    this.UTXOSwapClient = new Client(isMainnet, UTXOSwapApiKey);
    this.CKBClient = configService.get<boolean>("is_mainnet")
      ? new ccc.ClientPublicMainnet({ url: ckbRpcUrl })
      : new ccc.ClientPublicTestnet({ url: ckbRpcUrl });
    this.collector = new Collector({ ckbIndexerUrl });

    const scenarioSnapshotIntervalInSeconds = configService.get<number>(
      "scenarioSnapshot.interval_in_seconds",
    );
    if (scenarioSnapshotIntervalInSeconds === undefined) {
      throw Error("Empty scenarioSnapshotIntervalInSeconds");
    }
    this.logger.verbose("ScenarioSnapshotService.constructor | finished");
    autoRun(this.logger, scenarioSnapshotIntervalInSeconds * 1000, () =>
      this.main(),
    );
  }
  /* Main Function */
  async main(): Promise<void> {
    this.logger.debug("ScenarioSnapshotService.main | started");
    const latestScenarioSnapshot = await this.getLatestScenarioSnapshot();
    this.strategyService.generateActions(latestScenarioSnapshot);
    this.executeService.executeActions(latestScenarioSnapshot);
    this.finalizeScenarioSnapshot(latestScenarioSnapshot);
    this.scenarioSnapshotRepo.syncScenarioSnapshot(latestScenarioSnapshot);
    this.logger.debug("ScenarioSnapshotService.main | finished");
  }

  async getLatestScenarioSnapshot(): Promise<ScenarioSnapshot> {
    const timestamp: number = Math.floor(Date.now() / 1000);
    const poolInfos: PoolInfo[] = [];
    const poolSnapshots: PoolSnapshot[] = [];
    const walletStatuses: WalletStatus[] = [];
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
    this.logger.verbose(
      "ScenarioSnapshotService.getLatestScenarioSnapshot | this.poolInfo",
      poolInfos,
    );
    this.logger.debug(
      `ScenarioSnapshotService.getLatestScenarioSnapshot | amount of pools: ${poolSnapshots.length}`,
    );

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
    this.logger.verbose(
      "ScenarioSnapshotService.getLatestScenarioSnapshot | walletStatuses",
      walletStatuses,
    );
    this.logger.debug(
      `ScenarioSnapshotService.getLatestScenarioSnapshot | amount of wallets: ${walletStatuses.length}`,
    );

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
    this.logger.debug(
      "ScenarioSnapshotService.getLatestScenarioSnapshot |",
      latestScenarioSnapshot,
    );
    return latestScenarioSnapshot;
  }

  async finalizeScenarioSnapshot(
    scenarioSnapshot: ScenarioSnapshot,
  ): Promise<void> {
    // TODO: Implement
    console.log(scenarioSnapshot);
    return;
  }
}
