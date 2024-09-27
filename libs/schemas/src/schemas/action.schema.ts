import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ScenarioSnapshot } from "./scenarioSnapshot.schema";

export enum ActionType {
  Transfer = "Transfer",
  Swap = "Swap",
  // AddLiquidity = "AddLiquidity",
  // RemoveLiquidity = "RemoveLiquidity",
  // SwapExactInputForOutput = "SwapExactInputForOutput",
  // SwapInputForExactOutput = "SwapInputForExactOutput",
  // ClaimProtocolLiquidity = "ClaimProtocolLiquidity",
}

export enum ActionStatus {
  Failed = "Failed",
  Aborted = "Aborted",
  NotStarted = "NotStarted",
  TxCreated = "TxCreated",
  IntentSent = "IntentSent",
  TransferSent = "TransferSent",
  Committed = "Committed",
  Confirmed = "Confirmed",
  Stored = "Stored",
}

@Entity()
export class Action {
  @PrimaryGeneratedColumn("increment")
  actionID: number;

  @Column(() => ScenarioSnapshot)
  scenarioSnapshot: ScenarioSnapshot;

  @Column({ type: "varchar" })
  actorAddress: string;

  @Column("simple-json")
  targets: {
    targetAddress: string;
    amount: string;
    originalAssetSymbol: string;
    originalAssetTokenDecimals: number;
    targetAssetSymbol: string;
    targetAssetTokenDecimals: number;
  }[];

  @Column({ type: "varchar" })
  rawType: string;

  @Column({
    type: "enum",
    enum: ActionType,
    default: ActionType.Transfer,
  })
  actionType: ActionType;

  @Column({
    type: "enum",
    enum: ActionStatus,
    default: ActionStatus.NotStarted,
  })
  actionStatus: ActionStatus;

  @Column({ type: "varchar" })
  actionTxHash: string;

  @Column({ type: "varchar" })
  @Index()
  txHash: string;

  @Column({ type: "longtext" })
  rawTx: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
