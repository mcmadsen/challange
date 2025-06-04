import { Controller, Get, Param } from "@nestjs/common";
import { TransactionAggregatorService } from "../services/transaction-aggregator.service";
import { AggregatedData, PayoutRequest } from "../models/transaction.model";

@Controller("transactions")
export class TransactionController {
  constructor(
    private readonly transactionAggregatorService: TransactionAggregatorService,
  ) {}

  @Get("aggregated/:userId")
  async getAggregatedData(
    @Param("userId") userId: string,
  ): Promise<AggregatedData> {
    return this.transactionAggregatorService.getAggregatedDataByUserId(userId);
  }

  @Get("payouts")
  async getRequestedPayouts(): Promise<PayoutRequest[]> {
    return this.transactionAggregatorService.getRequestedPayouts();
  }
}
