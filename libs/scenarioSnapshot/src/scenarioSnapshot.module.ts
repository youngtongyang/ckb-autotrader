import { ExecuteService } from "@app/execute";
import { StrategyService } from "@app/strategy";
import { Module } from "@nestjs/common";
import { CkbTxRepo } from "./repos";
import { ScenarioSnapshotService } from "./scenarioSnapshot.service";

@Module({
  providers: [
    ScenarioSnapshotService,
    CkbTxRepo,
    ExecuteService,
    StrategyService,
  ],
  exports: [ScenarioSnapshotService],
})
export class ScenarioSnapshotModule {}
