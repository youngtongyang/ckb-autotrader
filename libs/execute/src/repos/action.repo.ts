import { Action, ActionStatus } from "@app/schemas";
import { Injectable } from "@nestjs/common";
import { EntityManager, Repository } from "typeorm";

@Injectable()
export class ActionRepo extends Repository<Action> {
  constructor(manager: EntityManager) {
    super(Action, manager);
  }

  async updateStatus(action: Action, actionStatus: ActionStatus) {
    const res = await this.update(
      { actionID: action.actionID },
      { actionStatus },
    );
    if (!res.affected) {
      throw new Error(
        `Failed to update Action status for action: ${action.actionID}`,
      );
    }
    action.actionStatus = actionStatus;
  }

  async updateTxHash(action: Action, txHash: string) {
    const res = await this.update(
      { actionID: action.actionID },
      { actionStatus: ActionStatus.TxCreated, txHash },
    );
    if (!res.affected) {
      throw new Error(
        `Failed to update action tx hash for Action ${action.actionID}`,
      );
    }
    action.actionStatus = ActionStatus.TxCreated;
    action.txHash = txHash;
  }

  findTxByHash(txHash: string): Promise<Action | null> {
    return this.findOneBy({ txHash });
  }
}
