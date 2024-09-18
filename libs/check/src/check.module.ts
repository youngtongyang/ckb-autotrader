import { Module } from "@nestjs/common";
import { CheckService } from "./check.service";
import { ActionRepo } from "./repos";

@Module({
  providers: [CheckService, ActionRepo],
  exports: [CheckService],
})
export class CheckModule {}
