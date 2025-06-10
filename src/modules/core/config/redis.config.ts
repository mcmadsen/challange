import { RedisMemoryServer } from "redis-memory-server";
import { Logger } from "@nestjs/common";

export class RedisConfig {
  private static redisMemoryServer: RedisMemoryServer | null = null;
  private static readonly logger = new Logger(RedisConfig.name);

  static async getRedisOptions(): Promise<{ host: string; port: number }> {
    if (!this.redisMemoryServer) {
      try {
        this.redisMemoryServer = new RedisMemoryServer();
        await this.redisMemoryServer.start();
      } catch (error) {
        this.logger.error(
          "Failed to start Redis memory server",
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    }

    try {
      const host = await this.redisMemoryServer.getHost();
      const port = await this.redisMemoryServer.getPort();

      this.logger.debug(`Redis server running at ${host}:${port}`);

      return {
        host,
        port,
      };
    } catch (error) {
      this.logger.error(
        "Failed to get Redis connection details",
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  static async closeConnection(): Promise<void> {
    if (this.redisMemoryServer) {
      try {
        await this.redisMemoryServer.stop();
      } catch (error) {
        this.logger.error(
          "Failed to stop Redis memory server",
          error instanceof Error ? error.stack : String(error),
        );
      } finally {
        this.redisMemoryServer = null;
      }
    }
  }
}
