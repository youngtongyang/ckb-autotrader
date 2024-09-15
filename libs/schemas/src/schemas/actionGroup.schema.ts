import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum PlanStatus {
  Saved = "Saved",
  TxCreated = "TxCreated",
  Finished = "Finished",
}

export enum ActionType {
  AddLiquidity = 1,
  RemoveLiquidity = 2,
  SwapExactInputForOutput = 3,
  SwapInputForExactOutput = 4,
  ClaimProtocolLiquidity = 5,
  Transfer = 6,
}

export enum ActionStatus {
  NotStarted = 0,
  IntentPending = 1,
  IntentCreated = 2,
  TransferPending = 3,
  Confirmed = 4,
}

@Entity()
export class WalletStatus {
  @PrimaryColumn()
  block_height: number;

  @Column({ type: "varchar" })
  address: string;

  @Column("simple-json")
  balances: { symbol: string; balance: string }[];
}

@Entity()
export class ScenarioSnapshot {
  @PrimaryColumn()
  block_height: number;

  @Column("simple-json")
  wallet_statuses: WalletStatus[];
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

  @Column({ type: "varchar" })
  action_status: ActionStatus;

  @Column({ type: "varchar" })
  action_tx_hash: string;
}

@Entity()
export class ActionGroup {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "integer" })
  creation_block_number: number;

  @Column(() => ScenarioSnapshot)
  scenario_snapshot: ScenarioSnapshot;

  @OneToMany(() => Action, (action) => action.action_group_id)
  actions: Action[];

  @Column({ type: "text" })
  rawType: string;

  @Column({ type: "varchar" })
  status: PlanStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
