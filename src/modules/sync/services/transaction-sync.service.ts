import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  TRANSACTION_SYNC_QUEUE,
  SyncTransactionsJobData,
  TransactionSyncJobs,
} from "../queues/transaction-sync.queue";
import { SyncState, SyncStateDocument } from "../schemas/sync-state.schema";

@Injectable()
export class TransactionSyncService {
  private readonly logger = new Logger(TransactionSyncService.name);
  private readonly SYNC_STATE_KEY = "transaction-sync";

  constructor(
    @InjectQueue(TRANSACTION_SYNC_QUEUE)
    private transactionSyncQueue: Queue<SyncTransactionsJobData>,
    @InjectModel(SyncState.name)
    private syncStateModel: Model<SyncStateDocument>,
  ) {}

  @Cron("0 * * * * *") // Run every minute (at 0 seconds)
  async scheduleTransactionSync(): Promise<void> {
    try {
      const now = new Date();

      // Get last sync time from database
      let syncState = await this.syncStateModel.findOne({
        key: this.SYNC_STATE_KEY,
      });
      const lastSyncTime = syncState?.lastSyncTime || new Date(0);

      const startDate = lastSyncTime.toISOString();
      const endDate = now.toISOString();

      this.logger.log(
        `Scheduling transaction sync from ${startDate} to ${endDate}`,
      );

      // Add job to the queue
      await this.transactionSyncQueue.add(
        TransactionSyncJobs.SYNC_TRANSACTIONS,
        {
          startDate,
          endDate,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential" as const,
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      // Update last sync time in database
      if (syncState) {
        syncState.lastSyncTime = now;
        await syncState.save();
      } else {
        syncState = await this.syncStateModel.create({
          key: this.SYNC_STATE_KEY,
          lastSyncTime: now,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error scheduling transaction sync: ${errorMessage}`,
        errorStack,
      );
    }
  }
}
