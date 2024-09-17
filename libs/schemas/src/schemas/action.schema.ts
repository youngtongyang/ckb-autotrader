import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ScenarioSnapshot } from "./scenarioSnapshot.schema";

export enum ActionType {
  AddLiquidity = 1,
  RemoveLiquidity = 2,
  SwapExactInputForOutput = 3,
  SwapInputForExactOutput = 4,
  ClaimProtocolLiquidity = 5,
  Transfer = 6,
}

export enum ActionStatus {
  Aborted = -1,
  NotStarted = 0,
  IntentCreationPending = 1,
  IntentCreated = 2,
  TransferPending = 3,
  Confirmed = 4,
  Stored = 5,
}

@Entity()
export class Action {
  @PrimaryGeneratedColumn("increment")
  actionID: number;

  @Column(() => ScenarioSnapshot)
  scenarioSnapshotTimestamp: ScenarioSnapshot;

  @Column({ type: "varchar" })
  actorAddress: string;

  @Column({ type: "varchar" })
  targetAddress: string;

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
}
