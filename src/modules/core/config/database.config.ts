import { MongoMemoryServer } from "mongodb-memory-server";
import { MongooseModuleOptions } from "@nestjs/mongoose";
import { Logger } from "@nestjs/common";

export class DatabaseConfig {
  private static mongoMemoryServer: MongoMemoryServer;
  private static readonly logger = new Logger(DatabaseConfig.name);

  static async getMongooseOptions(): Promise<MongooseModuleOptions> {
    if (!this.mongoMemoryServer) {
      this.mongoMemoryServer = await MongoMemoryServer.create();
    }

    const uri = this.mongoMemoryServer.getUri();
    // Log the uri for debugging purpose
    DatabaseConfig.logger.debug(`MongoDB URI: ${uri}`);
    return {
      uri,
    };
  }

  static async closeConnection(): Promise<void> {
    if (this.mongoMemoryServer) {
      await this.mongoMemoryServer.stop();
    }
  }
}
