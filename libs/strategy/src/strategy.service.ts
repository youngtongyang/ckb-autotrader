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
import { Strategy } from "parameters";
import { redistributeTokensWithinWallet } from "./libs";

@Injectable()
export class StrategyService {
  readonly logger = new Logger(StrategyService.name);
  private readonly requester: Axios;
  private readonly client: ccc.Client;
  private readonly rootKey: HDKey;
  private readonly pathPrefix: string;
  private readonly feeRate: number;
  private activeStrategies: Strategy[] = [];

  constructor(
    configService: ConfigService,
    readonly actionRepo: ActionRepo,
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
    // redistributeTokensAcrossWallets(this, scenarioSnapshot, ["CKB", "RUSD"]);
    redistributeTokensWithinWallet(
      this,
      scenarioSnapshot,
      scenarioSnapshot.walletStatuses[0],
    );
    return;
  }

  /* Other Strategy-related Functions */
  private async spawnTemporaryWallets(): Promise<void> {
    //TODO: implement
  }
}
