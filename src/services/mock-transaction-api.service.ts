import { Injectable } from "@nestjs/common";
import {
  Transaction,
  TransactionResponse,
  TransactionType,
} from "../models/transaction.model";

@Injectable()
export class MockTransactionApiService {
  private transactions: Transaction[] = [
    {
      id: "41bbdf81-735c-4aea-beb3-3e5f433a30c5",
      userId: "074092",
      createdAt: "2023-03-16T12:33:11.000Z",
      type: TransactionType.PAYOUT,
      amount: 30,
    },
    {
      id: "41bbdf81-735c-4aea-beb3-3e5fasfsdfef",
      userId: "074092",
      createdAt: "2023-03-12T12:33:11.000Z",
      type: TransactionType.SPENT,
      amount: 12,
    },
    {
      id: "41bbdf81-735c-4aea-beb3-342jhj234nj234",
      userId: "074092",
      createdAt: "2023-03-15T12:33:11.000Z",
      type: TransactionType.EARNED,
      amount: 1.2,
    },
    // Additional mock data for different users
    {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      userId: "074093",
      createdAt: "2023-03-14T10:15:22.000Z",
      type: TransactionType.EARNED,
      amount: 50,
    },
    {
      id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      userId: "074093",
      createdAt: "2023-03-15T14:22:33.000Z",
      type: TransactionType.SPENT,
      amount: 15,
    },
    {
      id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
      userId: "074093",
      createdAt: "2023-03-16T09:45:11.000Z",
      type: TransactionType.PAYOUT,
      amount: 20,
    },
    {
      id: "d4e5f6a7-b8c9-0123-defg-2345678901234",
      userId: "074094",
      createdAt: "2023-03-10T08:33:21.000Z",
      type: TransactionType.EARNED,
      amount: 100,
    },
    {
      id: "e5f6a7b8-c9d0-1234-efgh-3456789012345",
      userId: "074094",
      createdAt: "2023-03-12T16:44:55.000Z",
      type: TransactionType.SPENT,
      amount: 35,
    },
  ];

  async getTransactions(
    startDate: string,
    endDate: string,
    page = 1,
    limit = 1000,
  ): Promise<TransactionResponse> {
    // Simulate API rate limiting (5 requests per minute)
    await new Promise((resolve) => setTimeout(resolve, 1000));

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
      },
    };
  }
}
