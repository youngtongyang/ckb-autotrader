import { ScenarioSnapshot } from "@app/schemas";
import { Injectable } from "@nestjs/common";
import { EntityManager, Repository } from "typeorm";

@Injectable()
export class ScenarioSnapshotRepo extends Repository<ScenarioSnapshot> {
  constructor(manager: EntityManager) {
    super(ScenarioSnapshot, manager);
  }
}
