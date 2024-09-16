import { Hex, PoolInfo } from "@utxoswap/swap-sdk-js";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
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
  @Column({ type: "varchar" })
  address: string;

  @Column("simple-json")
  balances: { symbol: string; balance: bigint }[];
}

@Entity()
export class PoolSnapshot {
  @Column({ type: "varchar" })
  assetXSymbol: string;
  @Column({ type: "varchar" })
  assetYSymbol: string;
  @Column()
  basedAsset: number;
  @Column()
  batchId: number;
  @Column()
  feeRate: number;
  @Column({ type: "varchar" })
  protocolLpAmount: string;
  @Column({ type: "varchar" })
  totalLpSupply: string;
  typeHash: Hex;
  @Column({ type: "varchar" })
  poolShare: string;
  @Column({ type: "varchar" })
  LPToken: string;
  @Column({ type: "varchar" })
  tvl: string;
  @Column({ type: "varchar" })
  dayTxsCount: string;
  @Column({ type: "varchar" })
  dayVolume: string;
  @Column({ type: "varchar" })
  dayApr: string;
}

@Entity()
export class ScenarioSnapshot {
  @PrimaryColumn()
  timestamp: number;

  // TODO: Seems missing
  // @Column()
  // blockHeight: number;

  @Column()
  ScenarioSnapshotStatus: ScenarioSnapshotStatus;

  @Column("simple-json")
  walletStatuses: WalletStatus[];

  @Column("simple-json") // Serializable version of poolInfos
  poolSnapshots: PoolSnapshot[];

  poolInfos: PoolInfo[];
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
