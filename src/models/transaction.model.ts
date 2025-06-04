export enum TransactionType {
  EARNED = "earned",
  SPENT = "spent",
  PAYOUT = "payout",
}

export interface Transaction {
  id: string;
  userId: string;
  createdAt: string;
  type: TransactionType;
  amount: number;
}

export interface TransactionResponse {
  items: Transaction[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface AggregatedData {
  userId: string;
  balance: number;
  earned: number;
  spent: number;
  payout: number;
  paidOut: number;
}

export interface PayoutRequest {
  userId: string;
  amount: number;
}
