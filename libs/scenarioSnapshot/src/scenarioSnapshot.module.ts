import { Module } from "@nestjs/common";
import { CkbTxRepo } from "./repos";
import { ScenarioSnapshotService } from "./scenarioSnapshot.service";

@Module({
  providers: [ScenarioSnapshotService, CkbTxRepo],
  exports: [ScenarioSnapshotService],
})
export class ScenarioSnapshotModule {}
