import { ActionRepo } from "@app/execute/repos";
import { ScenarioSnapshotRepo } from "@app/scenarioSnapshot/repos";
import { Module } from "@nestjs/common";
import { StrategyService } from "./strategy.service";

@Module({
  providers: [StrategyService, ActionRepo, ScenarioSnapshotRepo],
  exports: [StrategyService],
})
export class StrategyModule {}
