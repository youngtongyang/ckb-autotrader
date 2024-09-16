import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Action } from "./action.schema";

export enum ActionGroupStatus {
  NotStarted = "NotStarted",
  Executing = "Executing",
  Aborted = "Aborted",
  Completed = "Completed",
}

export enum ScenarioSnapshotStatus {
  Stored = "Stored",
  NotStored = "NotStored",
}

@Entity()
export class WalletStatus {
  @PrimaryGeneratedColumn("increment")
  action_id: number;

  @Column({ type: "varchar" })
  address: string;

  @Column("simple-json")
  balances: { symbol: string; balance: string }[];
}

@Entity()
export class ScenarioSnapshot {
  @PrimaryColumn()
  timestamp: number;

  @Column()
  blockHeight: number;

  @Column()
  ScenarioSnapshotStatus: ScenarioSnapshotStatus;

  @Column("simple-json")
  walletStatuses: WalletStatus[];

  @Column("simple-json")
  price_references: {
    inputSymbol: string;
    outputSymbol: string;
    buyPrice: string;
    decimals: string;
  }[];
}

@Entity()
export class ActionGroup {
  @PrimaryColumn()
  creationTimestamp: number;

  @Column({ type: "integer" })
  creationBlockNumber: number;

  @Column(() => ScenarioSnapshot)
  scenarioSnapshot: ScenarioSnapshot;

  @OneToMany(() => Action, (action) => action.action_group_id)
  actions: Action[];

  @Column({ type: "text" })
  rawType: string;

  @Column({
    type: "enum",
    enum: ActionGroupStatus,
    default: ActionGroupStatus.NotStarted,
  })
  actionGroupStatus: ActionGroupStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
