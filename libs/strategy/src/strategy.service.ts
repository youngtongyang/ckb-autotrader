// import { autoRun, foreachInRepo, withTransaction } from "@app/commons";
// import { CkbTxStatus, ActionGroupStatus, ActionGroup } from "@app/schemas";
import { ActionRepo } from "@app/execute/repos";
import { ScenarioSnapshot } from "@app/schemas";
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
    this.generateTransferActions(scenarioSnapshot);
    return;
  }

  private async generateTransferActions(
    scenarioSnapshot: ScenarioSnapshot,
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
    // TODO: Implement algorithm for generating transfer actions;
    return;
  }

  /* Other Strategy-related Functions */
  private async spawnTemporaryWallets(): Promise<void> {
    //TODO: implement
  }
}
