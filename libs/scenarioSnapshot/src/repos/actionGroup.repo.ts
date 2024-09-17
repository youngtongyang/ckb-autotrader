import { ScenarioSnapshot } from "@app/schemas";
import { Injectable } from "@nestjs/common";
import { EntityManager, Repository } from "typeorm";

@Injectable()
export class ScenarioSnapshotRepo extends Repository<ScenarioSnapshot> {
  constructor(manager: EntityManager) {
    super(ScenarioSnapshot, manager);
  }

  // async updateStatus(plan: ActionGroup, action: Action, status: ActionStatus) {
  //   const res = await this.update(
  //     { id: plan.id, status: plan.status },
  //     { status },
  //   );
  //   if (!res.affected) {
  //     throw new Error(`Failed to update plan status ${plan.id}`);
  //   }
  //   plan.status = status;
  // }

  // async updateTxHash(plan: ActionGroup, txHash: string) {
  //   // const res = await this.update(
  //   //   { id: plan.id },
  //   //   { status: PlanStatus.TxCreated, txHash },
  //   // );
  //   // if (!res.affected) {
  //   //   throw new Error(`Failed to update plan tx hash ${plan.id}`);
  //   // }
  //   // plan.status = PlanStatus.TxCreated;
  //   // plan.txHash = txHash;
  // }
}
