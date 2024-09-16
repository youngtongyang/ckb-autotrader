// import { autoRun, foreachInRepo, withTransaction } from "@app/commons";
// import { CkbTxStatus, actionGroupStatus, actionGroup } from "@app/schemas";
import { ccc } from "@ckb-ccc/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { Pool } from "@utxoswap/swap-sdk-js";
import axios, { Axios } from "axios";
import { EntityManager } from "typeorm";
import { ActionGroupRepo, CkbTxRepo } from "./repos";

@Injectable()
export class ScenarioSnapshotService {
  private readonly logger = new Logger(ScenarioSnapshotService.name);
  private readonly requester: Axios;
  private readonly client: ccc.Client;
  private readonly rootKey: HDKey;
  private readonly pathPrefix: string;
  private readonly feeRate: number;
  private pools: Pool[] = [];

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
