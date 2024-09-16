import { Module } from "@nestjs/common";
import { ExecuteService } from "./execute.service";
import { CkbTxRepo } from "./repos";

@Module({
  providers: [ExecuteService, CkbTxRepo],
  exports: [ExecuteService],
})
export class ExecuteModule {}
