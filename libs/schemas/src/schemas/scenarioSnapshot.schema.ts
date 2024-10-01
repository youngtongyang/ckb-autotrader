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
  tokenBalances: { symbol: string; balance: string }[];
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
  @Column()
  unitBuyPrice: string;
  @Column()
  unitSellPrice: string;
}

@Entity()
export class ScenarioSnapshot {
  @PrimaryColumn()
  timestamp: number;

  // TODO: Seems missing
  // @Column()
  // blockHeight: number;

  @Column()
  scenarioSnapshotStatus: ScenarioSnapshotStatus;

  @OneToMany(() => Action, (action) => action.scenarioSnapshot)
  actions: Action[];

  @Column({
    type: "enum",
    enum: ActionGroupStatus,
    default: ActionGroupStatus.NotStarted,
  })
  actionGroupStatus: ActionGroupStatus;

  @Column("simple-json")
  walletStatuses: WalletStatus[];

  @Column("simple-json") // Serializable version of poolInfos
  poolSnapshots: PoolSnapshot[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /* Fields for buffering calculations only */
  poolInfos: PoolInfo[];
  pendingBalanceChanges: {
    symbol: string;
    address: string;
    balanceChange: number;
  }[];
}

// class ScenarioSnapshotFlags {
//   pool: boolean;
//   wallet: boolean;
// }
