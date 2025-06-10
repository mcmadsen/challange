import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Job, JobId, Queue } from "bull";
import { Model } from "mongoose";
import { MockTransactionApiService } from "../../api-integration/services/mock-transaction-api.service";
import {
  Transaction as TransactionSchema,
  TransactionDocument,
} from "../../transaction/schemas/transaction.schema";
import {
  TRANSACTION_SYNC_QUEUE,
  SyncTransactionsJobData,
  SyncTransactionsPageJobData,
  TransactionSyncJobs,
} from "../queues/transaction-sync.queue";

@Processor(TRANSACTION_SYNC_QUEUE)
export class TransactionSyncProcessor {
  private readonly logger = new Logger(TransactionSyncProcessor.name);
  private readonly PAGE_LIMIT = 1000; // API limit per request

  constructor(
    @InjectModel(TransactionSchema.name)
    private transactionModel: Model<TransactionDocument>,
    private mockTransactionApiService: MockTransactionApiService,
    @InjectQueue(TRANSACTION_SYNC_QUEUE)
    private transactionSyncQueue: Queue<SyncTransactionsPageJobData>,
  ) {}

  /**
   * Makes an API call with a 12-second delay to respect rate limits
   * Does not implement retries as this is handled by Bull
   */
  private async makeApiCallWithDelay(
    startDate: string,
    endDate: string,
    page: number,
    limit: number,
  ) {
    try {
      // Wait for 12 seconds before making the request
      await new Promise((resolve) => setTimeout(resolve, 12000));
      return await this.mockTransactionApiService.getTransactions(
        startDate,
        endDate,
        page,
        limit,
      );
    } catch (error) {
      // Check if this is a rate limit error (HTTP 429)
      if (error?.response?.statusCode === 429) {
        this.logger.warn(
          `Rate limit exceeded, job will be retried after backoff`,
        );
      }
      throw error;
    }
  }

  @Process({
    name: TransactionSyncJobs.SYNC_TRANSACTIONS,
    concurrency: 1, // Ensure only one job runs at a time
  })
  async syncTransactions(job: Job<SyncTransactionsJobData>): Promise<void> {
    try {
      const { startDate, endDate } = job.data;
      this.logger.log(`Syncing transactions from ${startDate} to ${endDate}`);

      // First, get the total number of pages
      const initialResponse = await this.makeApiCallWithDelay(
        startDate,
        endDate,
        1,
        this.PAGE_LIMIT,
      );

      const totalPages = initialResponse.meta.totalPages;
      this.logger.log(`Found ${totalPages} pages of transactions to sync`);

      // Create a job for each page
      const pageJobs: JobId[] = [];
      for (let page = 1; page <= totalPages; page++) {
        const pageJob = await this.transactionSyncQueue.add(
          TransactionSyncJobs.SYNC_TRANSACTIONS_PAGE,
          {
            startDate,
            endDate,
            page,
            parentJobId: job.id,
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
        pageJobs.push(pageJob.id);
      }

      // Wait for all page jobs to complete
      if (pageJobs.length > 0) {
        this.logger.log(`Waiting for ${pageJobs.length} page jobs to complete`);
        await Promise.all(
          pageJobs.map((jobId) =>
            this.transactionSyncQueue
              .getJob(jobId)
              .then((job) => job?.finished()),
          ),
        );
      }

      this.logger.log(`All transaction sync page jobs completed successfully`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(
        `Error during transaction sync: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Process({
    name: TransactionSyncJobs.SYNC_TRANSACTIONS_PAGE,
    // Ensure only one page job runs at a time to avoid rate limiting
    concurrency: 1,
  })
  async syncTransactionsPage(
    job: Job<SyncTransactionsPageJobData>,
  ): Promise<void> {
    try {
      const { startDate, endDate, page, parentJobId } = job.data;

      this.logger.log(`Processing page ${page} for sync job ${parentJobId}`);

      // Get transactions for this specific page using the unified API call method
      const response = await this.makeApiCallWithDelay(
        startDate,
        endDate,
        page,
        this.PAGE_LIMIT,
      );

      // Process and save transactions
      if (response.items.length > 0) {
        const transactions = response.items.map((item) => ({
          transactionId: item.id,
          userId: item.userId,
          createdAt: new Date(item.createdAt),
          type: item.type,
          amount: item.amount,
        }));

        // Use insertMany for better performance
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

        this.logger.log(
          `Synced ${transactions.length} transactions (page ${page})`,
        );
      } else {
        this.logger.log(`No transactions found on page ${page}`);
      }

      await job.progress(100);
    } catch (error) {
      this.logger.error(
        `Error during page sync: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
