import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ActionGroup } from "./actionGroup.schema";

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
  action_id: number;

  @Column(() => ActionGroup)
  action_group_id: ActionGroup;

  @Column({ type: "varchar" })
  actor_address: string;

  @Column({ type: "varchar" })
  target_address: string;

  @Column({
    type: "enum",
    enum: ActionType,
    default: ActionType.Transfer,
  })
  action_type: ActionType;

  @Column({
    type: "enum",
    enum: ActionStatus,
    default: ActionStatus.NotStarted,
  })
  action_status: ActionStatus;

  @Column({ type: "varchar" })
  action_tx_hash: string;
}
