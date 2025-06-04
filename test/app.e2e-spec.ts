import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { MongooseModule } from "@nestjs/mongoose";
import { DatabaseConfig } from "../src/config/database.config";

describe("TransactionController (e2e)", () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: async () => {
            return await DatabaseConfig.getMongooseOptions();
          },
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await DatabaseConfig.closeConnection();
    await moduleFixture.close();
  });

  it("/transactions/aggregated/:userId (GET)", () => {
    const userId = "074092";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(app.getHttpServer())
      .get(`/transactions/aggregated/${userId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("userId", userId);
        expect(res.body).toHaveProperty("balance");
        expect(res.body).toHaveProperty("earned");
        expect(res.body).toHaveProperty("spent");
        expect(res.body).toHaveProperty("payout");
        expect(res.body).toHaveProperty("paidOut");
      });
  });

  it("/transactions/payouts (GET)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(app.getHttpServer())
      .get("/transactions/payouts")
      .expect(200)
      .expect((res) => {
        const body = res.body as Array<{ userId: string; amount: number }>;
        expect(Array.isArray(body)).toBe(true);
        if (body.length > 0) {
          expect(body[0]).toHaveProperty("userId");
          expect(body[0]).toHaveProperty("amount");
        }
      });
  });
});
