import { Module } from "@nestjs/common";
import { ActionRepo } from "./repos";
import { StrategyService } from "./strategy.service";

@Module({
  providers: [StrategyService, ActionRepo],
  exports: [StrategyService],
})
export class StrategyModule {}
