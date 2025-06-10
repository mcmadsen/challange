import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import {
  Transaction,
  TransactionResponse,
  TransactionType,
} from "../../transaction/models/transaction.model";
import { RedisService } from "../../core/services/redis.service";

@Injectable()
export class MockTransactionApiService {
  private transactions: Transaction[] = this.generateMockTransactions(6000);

  // Rate limit configuration: 5 requests per minute
  private readonly RATE_LIMIT = 5;
  private readonly RATE_LIMIT_WINDOW = 60; // seconds

  constructor(private readonly redisService: RedisService) {}

  private generateMockTransactions(count: number): Transaction[] {
    const transactions: Transaction[] = [];
    const userIds = ["074092", "074093", "074094", "074095", "074096"];
    const types = [
      TransactionType.EARNED,
      TransactionType.SPENT,
      TransactionType.PAYOUT,
    ];

    // Generate transactions from past dates (up to 2 years ago)
    const now = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);

    for (let i = 0; i < count; i++) {
      // Random date between now and two years ago
      const randomDate = new Date(
        twoYearsAgo.getTime() +
          Math.random() * (now.getTime() - twoYearsAgo.getTime()),
      );

      transactions.push({
        id: this.generateUUID(),
        userId: userIds[Math.floor(Math.random() * userIds.length)],
        createdAt: randomDate.toISOString(),
        type: types[Math.floor(Math.random() * types.length)],
        amount: parseFloat((Math.random() * 200 + 1).toFixed(2)),
      });
    }

    // Sort by date (newest first)
    return transactions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  async getTransactions(
    startDate: string,
    endDate: string,
    page = 1,
    limit = 1000,
  ): Promise<TransactionResponse> {
    // Generate a unique key for rate limiting based on client IP or user ID
    // For this mock service, we'll use a fixed key
    const rateLimitKey = "mock-api:rate-limit";

    // Check if the request is allowed based on rate limits
    const rateLimitResult = await this.redisService.checkRateLimit(
      rateLimitKey,
      this.RATE_LIMIT,
      this.RATE_LIMIT_WINDOW,
    );

    // If rate limit exceeded, throw an HTTP exception
    if (!rateLimitResult.allowed) {
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: "Rate limit exceeded",
          message: "Too many requests, please try again later",
          remainingSeconds: this.RATE_LIMIT_WINDOW,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add a small delay to simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 200));

    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredTransactions = this.transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.createdAt);
      return transactionDate >= start && transactionDate <= end;
    });

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTransactions = filteredTransactions.slice(
      startIndex,
      endIndex,
    );

    return {
      items: paginatedTransactions,
      meta: {
        totalItems: filteredTransactions.length,
        itemCount: paginatedTransactions.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(filteredTransactions.length / limit),
        currentPage: page,
        rateLimit: {
          limit: this.RATE_LIMIT,
          remaining: rateLimitResult.remaining,
          resetInSeconds: this.RATE_LIMIT_WINDOW,
        },
      },
    };
  }
}
