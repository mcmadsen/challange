import { Test, TestingModule } from "@nestjs/testing";
import { TransactionController } from "./transaction.controller";
import { TransactionAggregatorService } from "../services/transaction-aggregator.service";
import { AggregatedData, PayoutRequest } from "../models/transaction.model";

describe("TransactionController", () => {
  let controller: TransactionController;
  let service: TransactionAggregatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionAggregatorService,
          useValue: {
            getAggregatedDataByUserId: jest.fn(),
            getRequestedPayouts: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    service = module.get<TransactionAggregatorService>(
      TransactionAggregatorService,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getAggregatedData", () => {
    it("should return aggregated data for a user", async () => {
      const userId = "074092";
      const expectedResult: AggregatedData = {
        userId,
        balance: 50,
        earned: 100,
        spent: 30,
        payout: 20,
        paidOut: 20,
      };

      const getAggregatedDataSpy = jest
        .spyOn(service, "getAggregatedDataByUserId")
        .mockImplementation(async () => {
          await Promise.resolve();
          return expectedResult;
        });

      const result = await controller.getAggregatedDataByUserId(userId);
      expect(result).toBe(expectedResult);
      expect(getAggregatedDataSpy).toHaveBeenCalledWith(userId);
    });
  });

  describe("getRequestedPayouts", () => {
    it("should return requested payouts", async () => {
      const expectedResult: PayoutRequest[] = [
        { userId: "074092", amount: 50 },
        { userId: "074093", amount: 30 },
      ];

      const getRequestedPayoutsSpy = jest
        .spyOn(service, "getRequestedPayouts")
        .mockImplementation(async () => {
          await Promise.resolve();
          return expectedResult;
        });

      const result = await controller.getRequestedPayouts();
      expect(result).toBe(expectedResult);
      expect(getRequestedPayoutsSpy).toHaveBeenCalled();
    });
  });
});
