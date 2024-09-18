import { Action } from "@app/schemas";
import { Injectable } from "@nestjs/common";
import { EntityManager, Repository } from "typeorm";

@Injectable()
export class ActionRepo extends Repository<Action> {
  constructor(manager: EntityManager) {
    super(Action, manager);
  }

  findTxByHash(txHash: string): Promise<Action | null> {
    return this.findOneBy({ txHash });
  }
}
