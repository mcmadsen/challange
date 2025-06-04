import { Module, OnApplicationShutdown } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { TransactionController } from "./controllers/transaction.controller";
import { Transaction, TransactionSchema } from "./schemas/transaction.schema";
import { MockTransactionApiService } from "./services/mock-transaction-api.service";
import { TransactionAggregatorService } from "./services/transaction-aggregator.service";
import { DatabaseConfig } from "./config/database.config";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      useFactory: async () => {
        return await DatabaseConfig.getMongooseOptions();
      },
    }),
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [TransactionController],
  providers: [MockTransactionApiService, TransactionAggregatorService],
})
export class AppModule implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await DatabaseConfig.closeConnection();
  }
}
