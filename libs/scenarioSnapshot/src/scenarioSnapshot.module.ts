import { ExecuteService } from "@app/execute";
import { ActionRepo } from "@app/execute/repos";
import { StrategyService } from "@app/strategy";
import { Module } from "@nestjs/common";
import { ScenarioSnapshotRepo } from "./repos";
import { ScenarioSnapshotService } from "./scenarioSnapshot.service";

@Module({
  providers: [
    ScenarioSnapshotService,
    ActionRepo,
    ScenarioSnapshotRepo,
    ExecuteService,
    StrategyService,
  ],
  exports: [ScenarioSnapshotService],
})
export class ScenarioSnapshotModule {}
