import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TransactionController } from "./controllers/transaction.controller";
import { TransactionAggregatorService } from "./services/transaction-aggregator.service";
import { Transaction, TransactionSchema } from "./schemas/transaction.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionAggregatorService],
  exports: [TransactionAggregatorService],
})
export class TransactionModule {}
