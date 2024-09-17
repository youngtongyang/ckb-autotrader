import { CheckModule } from "@app/check";
import { loadConfig } from "@app/commons";
import { ExecuteModule } from "@app/execute";
import { SchemasModule } from "@app/schemas";
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
  ],
})
export class AppModule {}
