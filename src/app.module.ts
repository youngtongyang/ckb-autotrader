import { CheckModule } from "@app/check";
import { loadConfig } from "@app/commons";
import { ExecuteModule } from "@app/execute";
import { ScenarioSnapshotModule } from "@app/scenarioSnapshot";
import { SchemasModule } from "@app/schemas";
import { StrategyModule } from "@app/strategy";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    SchemasModule,
    CheckModule,
    ExecuteModule,
    ScenarioSnapshotModule,
    StrategyModule,
  ],
})
export class AppModule {}
