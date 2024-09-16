import { Module } from "@nestjs/common";
import { CkbTxRepo } from "./repos";
import { StrategyService } from "./strategy.service";

@Module({
  providers: [StrategyService, CkbTxRepo],
  exports: [StrategyService],
})
export class StrategyModule {}
