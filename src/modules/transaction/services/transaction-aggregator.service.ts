import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Transaction as TransactionSchema,
  TransactionDocument,
} from "../schemas/transaction.schema";
import {
  AggregatedData,
  PayoutRequest,
  TransactionType,
} from "../models/transaction.model";

@Injectable()
export class TransactionAggregatorService {
  private readonly logger = new Logger(TransactionAggregatorService.name);

  constructor(
    @InjectModel(TransactionSchema.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

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
