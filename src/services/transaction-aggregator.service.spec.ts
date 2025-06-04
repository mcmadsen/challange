import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { TransactionAggregatorService } from "./transaction-aggregator.service";
import { MockTransactionApiService } from "./mock-transaction-api.service";
import { Transaction, TransactionSchema } from "../schemas/transaction.schema";
import {
  TransactionResponse,
  TransactionType,
} from "../models/transaction.model";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Model } from "mongoose";

describe("TransactionAggregatorService", () => {
  let module: TestingModule;
  let service: TransactionAggregatorService;
  let mongodb: MongoMemoryServer;
  let transactionModel: Model<Transaction>;
  let mockTransactionApiService: MockTransactionApiService;

  beforeAll(async () => {
    // Set up the MongoDB Memory Server
    mongodb = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    // Clean up the MongoDB Memory Server
    await mongodb.stop();
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongodb.getUri()),
        MongooseModule.forFeature([
          { name: Transaction.name, schema: TransactionSchema },
        ]),
      ],
      providers: [TransactionAggregatorService, MockTransactionApiService],
    }).compile();

    service = module.get<TransactionAggregatorService>(
      TransactionAggregatorService,
    );

    transactionModel = module.get<Model<Transaction>>(
      getModelToken("Transaction"),
    );

    mockTransactionApiService = module.get<MockTransactionApiService>(
      MockTransactionApiService,
    );
  });

  afterEach(async () => {
    // Clear the in-memory database after each test
    await transactionModel.deleteMany();
    await module.close();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getAggregatedDataByUserId", () => {
    it("should return aggregated data for a user", async () => {
      const userId = "074092";
      const mockTransactions = [
        {
          transactionId: "1",
          userId,
          createdAt: new Date(),
          type: TransactionType.EARNED,
          amount: 100,
        },
        {
          transactionId: "2",
          userId,
          createdAt: new Date(),
          type: TransactionType.SPENT,
          amount: 30,
        },
        {
          transactionId: "3",
          userId,
          createdAt: new Date(),
          type: TransactionType.PAYOUT,
          amount: 20,
        },
      ];

      // Insert test data directly into the in-memory database
      await transactionModel.insertMany(mockTransactions);

      const result = await service.getAggregatedDataByUserId(userId);

      expect(result).toEqual({
        userId,
        balance: 50, // 100 - 30 - 20
        earned: 100,
        spent: 30,
        payout: 20,
        paidOut: 20,
      });
    });
  });

  describe("getRequestedPayouts", () => {
    it("should return aggregated payout requests", async () => {
      // Insert test data
      await transactionModel.insertMany([
        {
          transactionId: "1",
          userId: "074092",
          createdAt: new Date(),
          type: TransactionType.PAYOUT,
          amount: 50,
        },
        {
          transactionId: "2",
          userId: "074093",
          createdAt: new Date(),
          type: TransactionType.PAYOUT,
          amount: 30,
        },
      ]);

      const result = await service.getRequestedPayouts();

      expect(result).toEqual([
        { userId: "074092", amount: 50 },
        { userId: "074093", amount: 30 },
      ]);
    });
  });

  describe("syncTransactions", () => {
    it("should sync transactions from the API and save them to the database", async () => {
      // Mock the API response
      const mockTransactions = [
        {
          id: "tx1",
          userId: "074095",
          createdAt: "2023-04-01T10:00:00.000Z",
          type: TransactionType.EARNED,
          amount: 75,
        },
        {
          id: "tx2",
          userId: "074095",
          createdAt: "2023-04-01T11:00:00.000Z",
          type: TransactionType.SPENT,
          amount: 25,
        },
      ];

      const mockResponse: TransactionResponse = {
        items: mockTransactions,
        meta: {
          totalItems: mockTransactions.length,
          itemCount: mockTransactions.length,
          itemsPerPage: 1000,
          totalPages: 1,
          currentPage: 1,
        },
      };

      // Spy on the getTransactions method and return our mock response
      jest
        .spyOn(mockTransactionApiService, "getTransactions")
        .mockResolvedValue(mockResponse);

      // Call the method
      await service.syncTransactionsJob();

      // Verify the API was called with correct parameters
      expect(mockTransactionApiService.getTransactions).toHaveBeenCalled();

      // Verify transactions were saved to the database
      const savedTransactions = await transactionModel.find().lean();
      expect(savedTransactions).toHaveLength(2);

      // Verify the transaction data was correctly mapped and saved
      expect(savedTransactions[0]).toMatchObject({
        transactionId: "tx1",
        userId: "074095",
        type: TransactionType.EARNED,
        amount: 75,
      });

      expect(savedTransactions[1]).toMatchObject({
        transactionId: "tx2",
        userId: "074095",
        type: TransactionType.SPENT,
        amount: 25,
      });

      // Verify lastSyncTime was updated (it's a private property, so we need to check indirectly)
      // Call syncTransactions again with no new transactions
      const spy = jest
        .spyOn(mockTransactionApiService, "getTransactions")
        .mockResolvedValue({
          items: [],
          meta: {
            totalItems: 0,
            itemCount: 0,
            itemsPerPage: 1000,
            totalPages: 0,
            currentPage: 1,
          },
        });

      await service.syncTransactionsJob();

      const calls = spy.mock.calls;
      expect(calls.length).toBe(2);
      expect(calls[0][0]).not.toBe(calls[1][0]); // startDate should be different
    });

    it("should handle duplicate transactions gracefully", async () => {
      // Mock the API response with a transaction
      const mockTransaction = {
        id: "duplicate-tx",
        userId: "074096",
        createdAt: "2023-04-02T10:00:00.000Z",
        type: TransactionType.EARNED,
        amount: 50,
      };

      const mockResponse: TransactionResponse = {
        items: [mockTransaction],
        meta: {
          totalItems: 1,
          itemCount: 1,
          itemsPerPage: 1000,
          totalPages: 1,
          currentPage: 1,
        },
      };

      jest
        .spyOn(mockTransactionApiService, "getTransactions")
        .mockResolvedValue(mockResponse);

      // First sync - should save the transaction
      await service.syncTransactionsJob();

      // Verify transaction was saved
      let savedTransactions = await transactionModel.find().lean();
      expect(savedTransactions).toHaveLength(1);

      // Second sync with the same transaction - should handle duplicate gracefully
      await service.syncTransactionsJob();

      // Verify no duplicate was added
      savedTransactions = await transactionModel.find().lean();
      expect(savedTransactions).toHaveLength(1);
    });
  });
});
