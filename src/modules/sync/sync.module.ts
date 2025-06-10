import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { ApiIntegrationModule } from "../api-integration/api-integration.module";
import {
  Transaction,
  TransactionSchema,
} from "../transaction/schemas/transaction.schema";
import { TransactionSyncProcessor } from "./processors/transaction-sync.processor";
import { TransactionSyncService } from "./services/transaction-sync.service";
import { TRANSACTION_SYNC_QUEUE } from "./queues/transaction-sync.queue";
import { SyncState, SyncStateSchema } from "./schemas/sync-state.schema";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: TRANSACTION_SYNC_QUEUE,
    }),
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: SyncState.name, schema: SyncStateSchema },
    ]),
    ApiIntegrationModule,
  ],
  providers: [TransactionSyncProcessor, TransactionSyncService],
  exports: [TransactionSyncService],
})
export class SyncModule {}
