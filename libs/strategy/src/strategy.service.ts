// import { autoRun, foreachInRepo, withTransaction } from "@app/commons";
// import { CkbTxStatus, ActionGroupStatus, ActionGroup } from "@app/schemas";
import { ActionRepo } from "@app/execute/repos";
import { ScenarioSnapshot, WalletStatus } from "@app/schemas";
import { ccc } from "@ckb-ccc/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import axios, { Axios } from "axios";
import { BalanceConfig, Strategy } from "parameters";
import { walletRegistry } from "parameters/walletRegistry.example";

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);
  private readonly requester: Axios;
  private readonly client: ccc.Client;
  private readonly rootKey: HDKey;
  private readonly pathPrefix: string;
  private readonly feeRate: number;
  private activeStrategies: Strategy[] = [];

  constructor(
    configService: ConfigService,
    private readonly actionRepo: ActionRepo,
  ) {
    const mnemonic = configService.get<string>("server_mnemonic");
    if (!mnemonic) {
      throw Error("Empty mnemonic");
    }
    const feeRate = configService.get<number>("fee_rate");
    if (feeRate === undefined) {
      throw Error("Empty fee rate");
    }
    const checkInterval = configService.get<number>("check.interval");
    if (checkInterval === undefined) {
      throw Error("Empty check interval");
    }
    const ckbRpcUrl = configService.get<string>("check.ckb_rpc_url");

    this.rootKey = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic));
    this.pathPrefix = configService.get<string>("hd_path_prefix") ?? "";
    this.feeRate = feeRate;
    this.client = configService.get<boolean>("is_mainnet")
      ? new ccc.ClientPublicMainnet({ url: ckbRpcUrl })
      : new ccc.ClientPublicTestnet({ url: ckbRpcUrl });

    this.requester = axios.create({
      baseURL: configService.get<string>("check.mempool_rpc_url"),
    });
    /* Load Strategies */
    // TODO: Implement

    /* Manage Temporary Wallets */
    // TODO: Implement
  }

  /* Entry Function*/
  async generateActions(scenarioSnapshot: ScenarioSnapshot): Promise<void> {
    // NOTE: These are just examples. Feel free to modify them.
    this.redistributeTokensAcrossWallets(scenarioSnapshot, ["RUSD"]);
    this.redistributeTokensWithinWallet(
      scenarioSnapshot,
      scenarioSnapshot.walletStatuses[0],
    );
    return;
  }

  private async redistributeTokensWithinWallet(
    scenarioSnapshot: ScenarioSnapshot,
    targetWalletStatus: WalletStatus,
  ): Promise<void> {
    const activeBalanceConfigs: {
      address: string;
      balanceConfig: BalanceConfig;
    }[] = [];
    const matchingWallet = walletRegistry.find(
      (wallet) => wallet.address === targetWalletStatus.address,
    );
    if (!matchingWallet) {
      this.logger.error(
        `Strategy.redistributeTokensWithinWallet | Wallet ${targetWalletStatus.address} not found in wallet registry`,
      );
      throw Error(
        `Strategy.redistributeTokensWithinWallet | Wallet ${targetWalletStatus.address} not found in wallet registry`,
      );
    }
    if (matchingWallet.walletConfig.balanceConfig === undefined) {
      this.logger.warn(
        `Strategy.redistributeTokensWithinWallet | Wallet ${targetWalletStatus.address} has no balanceConfig`,
      );
      return;
    }
    for (const balanceConfig of matchingWallet.walletConfig.balanceConfig) {
      activeBalanceConfigs.push({
        address: targetWalletStatus.address,
        balanceConfig,
      });
    }

    const redistributionsReferences: {
      address: string;
      tokenSymbol: string;
      difference: bigint;
    }[] = [];

    let sumOfTokenValuesInCKB: bigint = BigInt(0);
    for (const config of activeBalanceConfigs) {
      const matchingBalance = targetWalletStatus.tokenBalances.find(
        (balance) => balance.symbol === config.balanceConfig.symbol,
      );
      if (!matchingBalance) {
        this.logger.error(
          `Strategy.redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} not found in wallet ${targetWalletStatus.address}`,
        );
        throw Error(
          `Strategy.redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} not found in wallet ${targetWalletStatus.address}`,
        );
      }
      const matchingPoolSnapshot = scenarioSnapshot.poolSnapshots.find(
        (poolSnapshot) =>
          poolSnapshot.assetYSymbol === "CKB" &&
          poolSnapshot.assetXSymbol === config.balanceConfig.symbol,
      );
      if (!matchingPoolSnapshot) {
        this.logger.error(
          `Strategy.redistributeTokensWithinWallet | Pool snapshot not found for token ${config.balanceConfig.symbol}`,
        );
        throw Error(
          `Strategy.redistributeTokensWithinWallet | Pool snapshot not found for token ${config.balanceConfig.symbol}`,
        );
      }
      sumOfTokenValuesInCKB =
        matchingBalance.balance * BigInt(matchingPoolSnapshot.unitSellPrice);
    }

    let sumOfPortions: number = 0;
    for (const config of activeBalanceConfigs) {
      if (config.balanceConfig.portionInStrategy === undefined) {
        this.logger.error(
          `Portion in strategy not defined for token ${config.balanceConfig.symbol} in wallet ${config.address}`,
        );
        continue;
      }
      sumOfPortions += config.balanceConfig.portionInStrategy;
    }

    for (const config of activeBalanceConfigs) {
      if (config.balanceConfig.portionInStrategy === undefined) {
        this.logger.error(
          `Portion in strategy not defined for token ${config.balanceConfig.symbol} in wallet ${config.address}`,
        );
        continue;
      }
      const portion = config.balanceConfig.portionInStrategy;
      const matchingPoolSnapshot = scenarioSnapshot.poolSnapshots.find(
        (poolSnapshot) =>
          poolSnapshot.assetYSymbol === "CKB" &&
          poolSnapshot.assetXSymbol === config.balanceConfig.symbol,
      );
      if (!matchingPoolSnapshot) {
        this.logger.error(
          `Strategy.redistributeTokensWithinWallet | Pool snapshot not found for token ${config.balanceConfig.symbol}`,
        );
        throw Error(
          `Strategy.redistributeTokensWithinWallet | Pool snapshot not found for token ${config.balanceConfig.symbol}`,
        );
      }
      const targetBalance =
        (sumOfTokenValuesInCKB * BigInt(portion)) /
        BigInt(sumOfPortions) /
        BigInt(matchingPoolSnapshot.unitSellPrice);
      const matchingBalance = targetWalletStatus.tokenBalances.find(
        (balance) => balance.symbol === config.balanceConfig.symbol,
      );
      if (!matchingBalance) {
        this.logger.error(
          `Strategy.redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} not found in wallet ${config.address}`,
        );
        throw Error(
          `Strategy.redistributeTokensWithinWallet | Token ${config.balanceConfig.symbol} not found in wallet ${config.address}`,
        );
      }
      const difference = targetBalance - matchingBalance.balance;
      if (difference === BigInt(0)) {
        // TODO: Implement tolerance
        continue;
      }
      redistributionsReferences.push({
        address: config.address,
        tokenSymbol: config.balanceConfig.symbol,
        difference,
      });
    }
    // TODO: Implement redistribution
    return;
  }

  private async redistributeTokensAcrossWallets(
    scenarioSnapshot: ScenarioSnapshot,
    tokenSymbols: string[],
  ): Promise<void> {
    const activeBalanceConfigs: {
      address: string;
      balanceConfig: BalanceConfig;
    }[] = [];
    for (const walletStatus of scenarioSnapshot.walletStatuses) {
      const matchingWallet = walletRegistry.find(
        (wallet) => wallet.address === walletStatus.address,
      );
      if (!matchingWallet) {
        this.logger.error(
          `Wallet ${walletStatus.address} not found in wallet registry`,
        );
        continue;
      }
      if (matchingWallet.walletConfig.balanceConfig === undefined) {
        continue;
      }
      for (const balanceConfig of matchingWallet.walletConfig.balanceConfig) {
        activeBalanceConfigs.push({
          address: walletStatus.address,
          balanceConfig,
        });
      }
    }
    const redistributionsReferences: {
      address: string;
      tokenSymbol: string;
      difference: bigint;
    }[] = [];
    for (const tokenSymbol of tokenSymbols) {
      const matchingConfigs = activeBalanceConfigs.filter(
        (config) => config.balanceConfig.symbol === tokenSymbol,
      );
      const walletsInvolved: WalletStatus[] = [];
      for (const config of matchingConfigs) {
        const walletStatus = scenarioSnapshot.walletStatuses.find(
          (walletStatus) => walletStatus.address === config.address,
        );
        if (!walletStatus) {
          this.logger.error(
            `Wallet ${config.address} not found in scenario snapshot`,
          );
          continue;
        }
        walletsInvolved.push(walletStatus);
      }
      let sumOfTokens: bigint = BigInt(0);
      for (const walletStatus of walletsInvolved) {
        const matchingBalance = walletStatus.tokenBalances.find(
          (balance) => balance.symbol === tokenSymbol,
        );
        if (!matchingBalance) {
          this.logger.error(
            `Token ${tokenSymbol} not found in wallet ${walletStatus.address}`,
          );
          continue;
        }
        sumOfTokens += matchingBalance.balance;
      }
      let sumOfPortions: number = 0;
      for (const config of matchingConfigs) {
        if (config.balanceConfig.portionInStrategy === undefined) {
          this.logger.error(
            `Portion in strategy not defined for token ${tokenSymbol} in wallet ${config.address}`,
          );
          continue;
        }
        sumOfPortions += config.balanceConfig.portionInStrategy;
      }
      for (const config of matchingConfigs) {
        if (config.balanceConfig.portionInStrategy === undefined) {
          this.logger.error(
            `Portion in strategy not defined for token ${tokenSymbol} in wallet ${config.address}`,
          );
          continue;
        }
        const portion = config.balanceConfig.portionInStrategy;
        const targetBalance =
          (sumOfTokens * BigInt(portion)) / BigInt(sumOfPortions);
        const matchingBalance = walletsInvolved
          .find((walletStatus) => walletStatus.address === config.address)
          ?.tokenBalances.find((balance) => balance.symbol === tokenSymbol);
        if (!matchingBalance) {
          this.logger.error(
            `Token ${tokenSymbol} not found in wallet ${config.address}`,
          );
          continue;
        }
        const difference = targetBalance - matchingBalance.balance;
        if (difference === BigInt(0)) {
          // TODO: Implement tolerance
          continue;
        }
        redistributionsReferences.push({
          address: config.address,
          tokenSymbol,
          difference,
        });
      }
    }
    // TODO: Implement redistribution
    return;
  }

  /* Other Strategy-related Functions */
  private async spawnTemporaryWallets(): Promise<void> {
    //TODO: implement
  }
}
