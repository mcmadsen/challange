import { Module } from "@nestjs/common";
import { MockTransactionApiService } from "./services/mock-transaction-api.service";
import { CoreModule } from "../core/core.module";

@Module({
  imports: [CoreModule],
  providers: [MockTransactionApiService],
  exports: [MockTransactionApiService],
})
export class ApiIntegrationModule {}
