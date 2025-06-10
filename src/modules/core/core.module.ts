import { Module, Global, OnApplicationShutdown } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bull";
import { DatabaseConfig } from "./config/database.config";
import { RedisConfig } from "./config/redis.config";
import { RedisService } from "./services/redis.service";

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => {
        return await DatabaseConfig.getMongooseOptions();
      },
    }),
    BullModule.forRootAsync({
      useFactory: async () => {
        const redisOptions = await RedisConfig.getRedisOptions();
        return {
          redis: {
            host: redisOptions.host,
            port: redisOptions.port,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: "exponential" as const,
              delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [MongooseModule, BullModule, RedisService],
})
export class CoreModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await DatabaseConfig.closeConnection();
    await RedisConfig.closeConnection();
  }
}
