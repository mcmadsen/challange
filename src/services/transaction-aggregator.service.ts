import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Cron } from "@nestjs/schedule";
import {
  Transaction as TransactionSchema,
  TransactionDocument,
} from "../schemas/transaction.schema";
import { MockTransactionApiService } from "./mock-transaction-api.service";
import {
  AggregatedData,
  PayoutRequest,
  TransactionType,
} from "../models/transaction.model";

@Injectable()
export class TransactionAggregatorService {
  private readonly logger = new Logger(TransactionAggregatorService.name);
  private lastSyncTime: Date = new Date(0); // Initialize with epoch time
  private syncInProgress = false;

  constructor(
    @InjectModel(TransactionSchema.name)
    private transactionModel: Model<TransactionDocument>,
    private mockTransactionApiService: MockTransactionApiService,
  ) {}

  private async syncTransactions(): Promise<void> {
    if (this.syncInProgress) {
      this.logger.log("Sync already in progress, skipping...");
      return;
    }

    this.syncInProgress = true;
    try {
      const now = new Date();
      const startDate = this.lastSyncTime.toISOString();
      const endDate = now.toISOString();

      this.logger.log(`Syncing transactions from ${startDate} to ${endDate}`);

      let page = 1;
      let hasMorePages = true;
      let totalSynced = 0;
      let requestCount = 0;
      const MAX_REQUESTS_PER_MINUTE = 5;
      const PAGE_LIMIT = 1000; // API limit per request

      // Track the time we started making requests
      const requestStartTime = Date.now();

      while (hasMorePages) {
        // Check if we've hit the rate limit
        if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
          // Calculate how long to wait before making more requests
          const elapsedMs = Date.now() - requestStartTime;
          const waitTimeMs = Math.max(60000 - elapsedMs, 0);

          if (waitTimeMs > 0) {
            this.logger.log(
              `Rate limit reached. Waiting ${waitTimeMs / 1000} seconds before continuing...`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
          }

          // Reset counters
          requestCount = 0;
        }

        // Get transactions from the API with pagination
        const response = await this.mockTransactionApiService.getTransactions(
          startDate,
          endDate,
          page,
          PAGE_LIMIT,
        );

        requestCount++;

        // Process and save transactions
        if (response.items.length > 0) {
          const transactions = response.items.map((item) => ({
            transactionId: item.id,
            userId: item.userId,
            createdAt: new Date(item.createdAt),
            type: item.type,
            amount: item.amount,
          }));

          // Use bulkWrite for better performance
          await this.transactionModel
            .insertMany(transactions, { ordered: false })
            .catch((error: { code?: number }) => {
              // Handle duplicate key errors (already synced transactions)
              if (error.code !== 11000) {
                throw error;
              }
              this.logger.warn(
                "Some transactions were already synced and skipped",
              );
            });

          totalSynced += transactions.length;
          this.logger.log(
            `Synced ${transactions.length} transactions (page ${page})`,
          );
        } else {
          this.logger.log(`No transactions found on page ${page}`);
        }

        // Check if we need to fetch more pages
        if (
          response.items.length < PAGE_LIMIT ||
          page >= response.meta.totalPages
        ) {
          hasMorePages = false;
        } else {
          page++;
        }
      }

      this.logger.log(
        `Sync completed. Total transactions synced: ${totalSynced}`,
      );

      // Update last sync time
      this.lastSyncTime = now;
    } finally {
      this.syncInProgress = false;
    }
  }

  async getAggregatedDataByUserId(userId: string): Promise<AggregatedData> {
    // Use MongoDB aggregation pipeline for efficient processing of large datasets
    const aggregationResult = await this.transactionModel
      .aggregate<Omit<AggregatedData, "userId">>([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            earned: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TransactionType.EARNED] },
                  "$amount",
                  0,
                ],
              },
            },
            spent: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TransactionType.SPENT] },
                  "$amount",
                  0,
                ],
              },
            },
            payout: {
              $sum: {
                $cond: [
                  { $eq: ["$type", TransactionType.PAYOUT] },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            earned: 1,
            spent: 1,
            payout: 1,
            balance: {
              $subtract: ["$earned", { $add: ["$spent", "$payout"] }],
            },
            paidOut: "$payout", // In this simple model, all payouts are considered paid out
          },
        },
      ])
      .exec();

    // If no transactions found, return default values
    if (!aggregationResult.length) {
      return {
        userId,
        balance: 0,
        earned: 0,
        spent: 0,
        payout: 0,
        paidOut: 0,
      };
    }

    // Return the aggregated data with userId
    return {
      userId,
      ...aggregationResult[0],
    };
  }

  @Cron("0 * * * * *") // Run every minute (at 0 seconds)
  async syncTransactionsJob(): Promise<void> {
    try {
      await this.syncTransactions();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error during scheduled transaction sync: ${errorMessage}`,
        errorStack,
      );
    }
  }

  async getRequestedPayouts(): Promise<PayoutRequest[]> {
    // Aggregate payout requests by user
    const payoutAggregation = await this.transactionModel
      .aggregate([
        { $match: { type: TransactionType.PAYOUT } },
        {
          $group: {
            _id: "$userId",
            amount: { $sum: "$amount" },
          },
        },
        {
          $project: {
            _id: 0,
            userId: "$_id",
            amount: 1,
          },
        },
        { $sort: { userId: 1 } }, // Sort by userId in ascending order
      ])
      .exec();

    return payoutAggregation as PayoutRequest[];
  }
}
