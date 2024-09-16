import { Module } from "@nestjs/common";
import { CheckService } from "./check.service";
import { ActionGroupRepo, CkbTxRepo } from "./repos";

@Module({
  providers: [CheckService, CkbTxRepo, ActionGroupRepo],
  exports: [CheckService],
})
export class CheckModule {}
