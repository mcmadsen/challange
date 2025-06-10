import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { RedisConfig } from "../config/redis.config";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: any;
  private readonly logger = new Logger(RedisService.name);

  async onModuleInit() {
    try {
      const redisOptions = await RedisConfig.getRedisOptions();

      // Dynamically import redis to avoid issues with ESM/CJS
      const redis = await import("redis");
      this.client = redis.createClient({
        socket: {
          host: redisOptions.host,
          port: redisOptions.port,
        },
      });

      await this.client.connect();
      this.logger.log("Redis client connected");
    } catch (error) {
      this.logger.error(
        "Failed to connect to Redis",
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log("Redis client disconnected");
    }
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowInSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - windowInSeconds * 1000;

    try {
      // Add the current timestamp to the sorted set
      await this.client.zAdd(key, { score: now, value: now.toString() });

      // Remove timestamps outside the current window
      await this.client.zRemRangeByScore(key, 0, windowStart);

      // Count requests in the current window
      const requestCount = await this.client.zCard(key);

      // Set expiry on the key to auto-cleanup
      await this.client.expire(key, windowInSeconds);

      const remaining = Math.max(0, limit - requestCount);
      const allowed = requestCount <= limit;

      this.logger.debug(
        `Rate limit check for key ${key}: allowed=${allowed}, remaining=${remaining}, requestCount=${requestCount}`,
      );

      return { allowed, remaining };
    } catch (error) {
      this.logger.error(
        `Rate limit check failed for key ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Fail open in case of Redis errors
      return { allowed: true, remaining: 1 };
    }
  }
}
