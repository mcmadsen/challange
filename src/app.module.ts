import { Module } from "@nestjs/common";
import { CoreModule } from "./modules/core/core.module";
import { TransactionModule } from "./modules/transaction/transaction.module";
import { ApiIntegrationModule } from "./modules/api-integration/api-integration.module";
import { SyncModule } from "./modules/sync/sync.module";

@Module({
  imports: [CoreModule, TransactionModule, ApiIntegrationModule, SyncModule],
})
export class AppModule {}
