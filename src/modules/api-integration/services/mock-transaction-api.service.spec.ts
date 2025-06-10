import { Test, TestingModule } from "@nestjs/testing";
import { MockTransactionApiService } from "./mock-transaction-api.service";
import { RedisService } from "../../core/services/redis.service";

describe("MockTransactionApiService", () => {
  let service: MockTransactionApiService;
  let redisServiceMock: Partial<RedisService>;

  beforeEach(async () => {
    // Create a mock for RedisService
    redisServiceMock = {
      checkRateLimit: jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 4,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockTransactionApiService,
        {
          provide: RedisService,
          useValue: redisServiceMock,
        },
      ],
    }).compile();

    service = module.get<MockTransactionApiService>(MockTransactionApiService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getTransactions", () => {
    it("should return transactions within date range", async () => {
      const startDate = "2023-03-14T00:00:00.000Z";
      const endDate = "2026-03-16T23:59:59.999Z";

      const result = await service.getTransactions(startDate, endDate);

      expect(result.items.length).toBeGreaterThan(0);
      expect(
        result.items.every((item) => {
          const date = new Date(item.createdAt);
          return date >= new Date(startDate) && date <= new Date(endDate);
        }),
      ).toBe(true);
    });

    it("should handle pagination correctly", async () => {
      const startDate = "2023-03-01T00:00:00.000Z";
      const endDate = "2026-03-31T23:59:59.999Z";
      const page = 1;
      const limit = 2;

      const result = await service.getTransactions(
        startDate,
        endDate,
        page,
        limit,
      );

      expect(result.items.length).toBeLessThanOrEqual(limit);
      expect(result.meta.itemsPerPage).toBe(limit);
      expect(result.meta.currentPage).toBe(page);
    });
  });
});
