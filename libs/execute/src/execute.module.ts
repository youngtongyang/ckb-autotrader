import { Module } from "@nestjs/common";
import { ExecuteService } from "./execute.service";
import { ActionRepo } from "./repos";

@Module({
  providers: [ExecuteService, ActionRepo],
  exports: [ExecuteService],
})
export class ExecuteModule {}
