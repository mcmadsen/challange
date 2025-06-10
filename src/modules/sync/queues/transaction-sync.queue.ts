import { JobId } from "bull";

export const TRANSACTION_SYNC_QUEUE = "transaction-sync";

export interface SyncTransactionsJobData {
  startDate: string;
  endDate: string;
}

export interface SyncTransactionsPageJobData {
  startDate: string;
  endDate: string;
  page: number;
  parentJobId: JobId;
}

export enum TransactionSyncJobs {
  SYNC_TRANSACTIONS = "sync-transactions",
  SYNC_TRANSACTIONS_PAGE = "sync-transactions-page",
}
