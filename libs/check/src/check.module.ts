import { Module } from "@nestjs/common";
import { CheckService } from "./check.service";
import { CkbTxRepo } from "./repos";

@Module({
  providers: [CheckService, CkbTxRepo],
  exports: [CheckService],
})
export class CheckModule {}
