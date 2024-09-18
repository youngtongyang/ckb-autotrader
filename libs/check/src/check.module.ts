import { ActionRepo } from "@app/execute/repos";
import { Module } from "@nestjs/common";
import { CheckService } from "./check.service";

@Module({
  providers: [CheckService, ActionRepo],
  exports: [CheckService],
})
export class CheckModule {}
