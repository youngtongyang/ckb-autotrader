/* eslint-disable @typescript-eslint/no-unused-vars */
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
import {
  Client,
  Collector,
  Pool,
  PoolInfo,
  Token,
} from "@utxoswap/swap-sdk-js";
import { Axios } from "axios";
import { CMMWallet } from "parameters";
import { activeTokenRegistry } from "parameters/tokenRegistry";
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
  private activePools: Token[] = [];
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
    const ckbIndexerUrl = configService.get<string>("common.ckb_indexer_url");
    if (ckbIndexerUrl === undefined) {
      throw Error("Empty ckb_indexer_url");
    }
    const UTXOSwapApiKey = configService.get<string>(
      "common.utxo_swap_api_key",
    );
    const isMainnet = configService.get<boolean>("is_mainnet");
    this.UTXOSwapClient = new Client(isMainnet, UTXOSwapApiKey);
    this.CKBClient = configService.get<boolean>("is_mainnet")
      ? new ccc.ClientPublicMainnet({ url: ckbRpcUrl })
      : new ccc.ClientPublicTestnet({ url: ckbRpcUrl });
    this.collector = new Collector({ ckbIndexerUrl });

    const scenarioSnapshotIntervalInSeconds = configService.get<number>(
      "scenario_snapshot.interval_in_seconds",
    );
    if (scenarioSnapshotIntervalInSeconds === undefined) {
      throw Error("Empty scenario_snapshot.interval_in_seconds");
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
    await this.briefReportOfLatestScenarioSnapshot(latestScenarioSnapshot);
    await this.strategyService.generateActions(latestScenarioSnapshot);
    // this.executeService.executeActions(latestScenarioSnapshot);
    // this.finalizeScenarioSnapshot(latestScenarioSnapshot);
    // this.scenarioSnapshotRepo.syncScenarioSnapshot(latestScenarioSnapshot);
  }

  async briefReportOfLatestScenarioSnapshot(
    latestScenarioSnapshot: ScenarioSnapshot,
  ): Promise<void> {
    this.logger.log(
      `ScenarioSnapshotService.briefReportOfLatestScenarioSnapshot | poolSnapshots.length: ${latestScenarioSnapshot.poolSnapshots.length}`,
    );
    for (const poolSnapshot of latestScenarioSnapshot.poolSnapshots) {
      this.logger.log(
        `ScenarioSnapshotService.briefReportOfLatestScenarioSnapshot | == Pool ${poolSnapshot.assetYSymbol}/${poolSnapshot.assetXSymbol}  UnitBuyPrice:${poolSnapshot.unitBuyPrice} UnitSellPrice:${poolSnapshot.unitSellPrice}`,
      );
    }
    this.logger.log(
      `ScenarioSnapshotService.briefReportOfLatestScenarioSnapshot | ${latestScenarioSnapshot.walletStatuses.length} wallets`,
    );
    for (const walletStatus of latestScenarioSnapshot.walletStatuses) {
      this.logger.log(
        `ScenarioSnapshotService.briefReportOfLatestScenarioSnapshot | == Wallet ${walletStatus.address}`,
      );
      walletStatus.tokenBalances.forEach((balance) => {
        this.logger.log(
          `ScenarioSnapshotService.briefReportOfLatestScenarioSnapshot | ==== ${balance.symbol}: ${balance.balance}`,
        );
      });
    }
  }

  async getLatestScenarioSnapshot(): Promise<ScenarioSnapshot> {
    const timestamp: number = Math.floor(Date.now() / 1000);
    const poolInfos: PoolInfo[] = [];
    const poolSnapshots: PoolSnapshot[] = [];
    const walletStatuses: WalletStatus[] = [];
    /* Get PoolInfos and store poolSnapshots */
    // TODO: Pagination might be necessary in the future
    const { list: pools } = await this.UTXOSwapClient.getPoolsByToken({
      pageNo: 0,
      pageSize: 100,
      searchKey:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
    });
    const activePools = pools.filter(
      (pool) =>
        ["CKB", ...activeTokenRegistry].includes(pool.assetY.symbol) &&
        ["CKB", ...activeTokenRegistry].includes(pool.assetX.symbol),
    );
    const additionalSearchKeys: string[] = [];
    const activeTokens: Token[] = [];
    for (const activePool of activePools) {
      if (
        ["CKB", ...activeTokenRegistry].includes(activePool.assetX.symbol) &&
        ["CKB", ...activeTokenRegistry].includes(activePool.assetY.symbol)
      ) {
        const activeToken =
          activePool.assetX.symbol === "CKB"
            ? activePool.assetY
            : activePool.assetX;
        if (!additionalSearchKeys.includes(activeToken.symbol)) {
          additionalSearchKeys.push(activeToken.symbol);
          activeTokens.push(activeToken);
        }
      }
    }

    for (const searchKey of additionalSearchKeys) {
      const { list: additionalPools } =
        await this.UTXOSwapClient.getPoolsByToken({
          pageNo: 0,
          pageSize: 100,
          searchKey,
        });
      for (const additionalPool of additionalPools) {
        if (
          ["CKB", ...activeTokenRegistry].includes(
            additionalPool.assetX.symbol,
          ) &&
          ["CKB", ...activeTokenRegistry].includes(
            additionalPool.assetY.symbol,
          ) &&
          activePools.every(
            (activePool) => activePool.typeHash !== additionalPool.typeHash,
          )
        ) {
          activePools.push(additionalPool);
        }
      }
    }

    for (const activePool of activePools) {
      const tokens: [Token, Token] = [activePool.assetX, activePool.assetY];
      const activePoolInstance = new Pool({
        tokens,
        ckbAddress: "",
        collector: this.collector,
        client: this.UTXOSwapClient,
        poolInfo: activePool,
      });
      const { output, priceImpact, buyPrice } =
        activePoolInstance.calculateOutputAmountAndPriceImpactWithExactInput(
          "1",
        );
      this.logger.verbose(
        `ScenarioSnapshotService.getLatestScenarioSnapshot | Price of Buying 1 ${activePool.assetX.symbol} with ${activePool.assetY.symbol}: ${buyPrice} ${activePool.assetY.symbol}`,
      );
      const reverseActivePoolInstance = new Pool({
        tokens: [activePool.assetY, activePool.assetX],
        ckbAddress: "",
        collector: this.collector,
        client: this.UTXOSwapClient,
        poolInfo: activePool,
      });
      const {
        output: reverseOutput,
        priceImpact: reversePriceImpact,
        buyPrice: reverseBuyPrice,
      } = reverseActivePoolInstance.calculateOutputAmountAndPriceImpactWithExactInput(
        "1",
      );
      this.logger.verbose(
        `ScenarioSnapshotService.getLatestScenarioSnapshot | Price of Buying 1 ${activePool.assetY.symbol} with ${activePool.assetX.symbol}: ${reverseBuyPrice} ${activePool.assetX.symbol}`,
      );
      const poolSnapshot: PoolSnapshot = {
        assetXSymbol: activePool.assetX.symbol,
        assetYSymbol: activePool.assetY.symbol,
        basedAsset: activePool.basedAsset,
        batchId: activePool.batchId,
        feeRate: activePool.feeRate,
        protocolLpAmount: activePool.protocolLpAmount,
        totalLpSupply: activePool.totalLpSupply,
        typeHash: activePool.typeHash,
        poolShare: activePool.poolShare,
        LPToken: activePool.LPToken,
        tvl: activePool.tvl,
        dayTxsCount: activePool.dayTxsCount,
        dayVolume: activePool.dayVolume,
        dayApr: activePool.dayApr,
        unitBuyPrice: buyPrice,
        unitSellPrice: reverseBuyPrice,
      };
      poolSnapshots.push(poolSnapshot);
      poolInfos.push(activePool);
    }
    this.logger.verbose(
      `ScenarioSnapshotService.getLatestScenarioSnapshot | poolInfo.length :${poolInfos.length}`,
    );
    this.logger.verbose(
      `ScenarioSnapshotService.getLatestScenarioSnapshot | poolSnapshots.length: ${poolSnapshots.length}`,
    );

    /* Get WalletStatuses */
    for (const wallet of walletRegistry) {
      this.logger.verbose(
        `ScenarioSnapshotService.getLatestScenarioSnapshot | getting wallet status for wallet ${wallet.address}`,
      );
      const walletStatus: WalletStatus = {
        address: wallet.address,
        tokenBalances: [
          {
            symbol: "CKB",
            balance: await getTokenBalance(this.collector, wallet.address),
          },
        ],
      };
      /* Enumerate and Get Balances */
      for (const activeToken of activeTokens) {
        this.logger.verbose(
          `ScenarioSnapshotService.getLatestScenarioSnapshot | getting ${activeToken.symbol} balance for wallet ${wallet.address}`,
        );
        const balance = await getTokenBalance(
          this.collector,
          wallet.address,
          activeToken.typeScript,
        );
        walletStatus.tokenBalances.push({
          symbol: activeToken.symbol,
          balance,
        });
        this.logger.verbose(
          `ScenarioSnapshotService.getLatestScenarioSnapshot | ${activeToken.symbol} balance for wallet ${wallet.address} is ${walletStatus.tokenBalances.slice(-1)[0].balance}`,
        );
      }
      this.logger.verbose(
        `ScenarioSnapshotService.getLatestScenarioSnapshot | walletStatus.balances.length: ${walletStatus.tokenBalances.length} for wallet ${wallet.address}`,
      );
      walletStatuses.push(walletStatus);
    }
    this.logger.verbose(
      `ScenarioSnapshotService.getLatestScenarioSnapshot | walletStatuses.length: ${walletStatuses.length}`,
    );

    /* Finalize */
    const latestScenarioSnapshot: ScenarioSnapshot = {
      timestamp,
      ScenarioSnapshotStatus: ScenarioSnapshotStatus.NotStored,
      walletStatuses,
      poolSnapshots,
      poolInfos,
      actions: [],
      actionGroupStatus: ActionGroupStatus.NotStarted,
      createdAt: new Date(),
      updatedAt: new Date(),
      pendingBalanceChanges: [],
    };

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
