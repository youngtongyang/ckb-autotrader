// import { autoRun, foreachInRepo, withTransaction } from "@app/commons";
// import { CkbTxStatus, ActionGroupStatus, ActionGroup } from "@app/schemas";
import { ccc } from "@ckb-ccc/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import axios, { Axios } from "axios";
import { EntityManager } from "typeorm";
import { ActionGroupRepo, CkbTxRepo } from "./repos";

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);
  private readonly requester: Axios;
  private readonly client: ccc.Client;
  private readonly rootKey: HDKey;
  private readonly pathPrefix: string;
  private readonly feeRate: number;

  constructor(
    configService: ConfigService,
    private readonly entityManager: EntityManager,
    private readonly ckbTxRepo: CkbTxRepo,
    private readonly actionGroupRepo: ActionGroupRepo,
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
    // autoRun(this.logger, checkInterval, () => this.checkActionGroups());
  }

  // async checkActionGroups() {
  //   const { data: blockNumber } =
  //     await this.requester.get("/blocks/tip/height");
  //   if (typeof blockNumber !== "number") {
  //     this.logger.error(`Invalid block number: ${blockNumber}`);
  //     return;
  //   }

  //   await foreachInRepo({
  //     repo: this.actiongroupRepo,
  //     criteria: {
  //       blockNumber: LessThanOrEqual(blockNumber),
  //       status: Or(Equal(ActionGroupStatus.Saved), Equal(ActionGroupStatus.TxCreated)),
  //     },
  //     isSerial: true,
  //     handler: async (actiongroup) => {
  //       switch (actiongroup.status) {
  //         case ActionGroupStatus.TxCreated:
  //           if (!(await this.handleTxCreatedActionGroup(actiongroup))) {
  //             return;
  //           }
  //         // Fallthrough to recreate failed tx
  //         case ActionGroupStatus.Saved: {
  //           if (!(await this.handleSavedActionGroup(actiongroup))) {
  //             return;
  //           }
  //           break;
  //         }
  //         default: {
  //           throw new Error(`Unknown actiongroup ${actiongroup.id} status ${status}`);
  //         }
  //       }
  //     },
  //   });
  // }

  // async handleTxCreatedActionGroup(actiongroup: ActionGroup): Promise<boolean> {
  //   if (!actiongroup.txHash) {
  //     this.logger.error(`Unexpected empty tx hash for actiongroup ${actiongroup.id}`);
  //     return false;
  //   }

  //   const tx = await this.ckbTxRepo.findTxByHash(actiongroup.txHash);
  //   if (!tx) {
  //     this.logger.error(`Tx with hash ${actiongroup.txHash} not found`);
  //     return false;
  //   }

  //   if (tx.status === CkbTxStatus.Failed) {
  //     this.logger.error(`ActionGroup ${actiongroup.id} failed.`);
  //     await this.Repo.updateStatus(actiongroup, ActionGroupStatus.Saved);
  //     await this.client.cache.clear();
  //     return true;
  //   } else if (tx.status === CkbTxStatus.Confirmed) {
  //     this.logger.log(`ActionGroup ${actiongroup.id} finished.`);
  //     await this.actiongroupRepo.updateStatus(actiongroup, ActionGroupStatus.Finished);
  //     return false;
  //   } else {
  //     return false;
  //   }
  // }

  // async handleSavedActionGroup(actiongroup: ActionGroup): Promise<boolean> {
  //   const key = this.rootKey.derive(`${this.pathPrefix}0`);
  //   if (!key.privateKey) {
  //     throw Error("Failed to derive key");
  //   }
  //   const signer = new ccc.SignerCkbPrivateKey(this.client, key.privateKey);
  //   const sendAddress = await signer.getRecommendedAddress();
  //   const { script: change } = await signer.getRecommendedAddressObj();

  //   const type = ccc.Script.from(JSON.parse(actiongroup.rawType));

  //   const tx = ccc.Transaction.from({
  //     outputs: [
  //       {
  //         lock: (await ccc.Address.fromString(actiongroup.address, this.client))
  //           .script,
  //         type,
  //       },
  //     ],
  //     outputsData: [ccc.numLeToBytes(actiongroup.amount, 16)],
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
  //     `Sending actiongroup ${actiongroup.id}, from ${sendAddress} amount ${actiongroup.amount} hash ${type.hash()} to ${actiongroup.address}, tx hash ${txHash}`,
  //   );

  //   await withTransaction(this.entityManager, undefined, async (manager) => {
  //     const actiongroupRepo = new ActionGroupRepo(manager);
  //     const ckbTxRepo = new CkbTxRepo(manager);

  //     const rawTx = tx.stringify();
  //     await actiongroupRepo.updateTxHash(actiongroup, txHash);
  //     await ckbTxRepo.save({
  //       txHash,
  //       rawTx,
  //       status: CkbTxStatus.Prepared,
  //     });
  //   });
  //   return true;
  // }
}
