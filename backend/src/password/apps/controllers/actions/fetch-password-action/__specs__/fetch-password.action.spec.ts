import { Test, TestingModule } from "@nestjs/testing";
import { FetchPasswordAction } from "../fetch-password.action";
import { FetchPasswordTransactionScript } from "../../../../../domain/transaction-scripts/fetch-password.transaction.script";
import { FetchPasswordResponder } from "../responders/fetch-password.responder";
import { Password } from "../../../../../domain/entities/password.entity";
import { PasswordResponseDto } from "../../shared/dtos/responses/password.response.dto";
import { NotFoundException } from "@nestjs/common";

describe("FetchPasswordAction", () => {
  let target: FetchPasswordAction;
  let fetchPasswordTS: jest.Mocked<FetchPasswordTransactionScript>;
  let fetchPasswordResponder: jest.Mocked<FetchPasswordResponder>;

  beforeEach(async () => {
    const mockFetchPasswordTS = {
      apply: jest.fn(),
    };

    const mockFetchPasswordResponder = {
      apply: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FetchPasswordAction,
        {
          provide: FetchPasswordTransactionScript,
          useValue: mockFetchPasswordTS,
        },
        {
          provide: FetchPasswordResponder,
          useValue: mockFetchPasswordResponder,
        },
      ],
    }).compile();

    target = module.get<FetchPasswordAction>(FetchPasswordAction);
    fetchPasswordTS = module.get(FetchPasswordTransactionScript);
    fetchPasswordResponder = module.get(FetchPasswordResponder);
  });

  describe("apply", () => {
    it("should return password DTO when password is found", async () => {
      const mockPassword: Password = {
        id: 1,
        name: "Test Password",
        username: "testuser",
        password: "testpass",
        userId: "user123",
        createdDate: new Date(),
        lastModifiedDate: new Date(),
        tags: [],
      };

      const mockResponseDto = new PasswordResponseDto({
        id: 1,
        name: "Test Password",
        username: "testuser",
        password: "testpass",
        createdDate: new Date(),
        lastModifiedDate: new Date(),
        tags: [],
      });

      const mockUser = { userId: "user123", username: "testuser" };

      fetchPasswordTS.apply.mockResolvedValue(mockPassword);
      fetchPasswordResponder.apply.mockReturnValue(mockResponseDto);

      const result = await target.apply(1, mockUser);

      expect(result).toEqual(mockResponseDto);
      expect(fetchPasswordTS.apply).toHaveBeenCalledWith(1, "user123");
      expect(fetchPasswordResponder.apply).toHaveBeenCalledWith(mockPassword);
    });

    it("should throw NotFoundException when password is not found", async () => {
      const mockUser = { userId: "user123", username: "testuser" };

      fetchPasswordTS.apply.mockResolvedValue(null);

      await expect(target.apply(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(fetchPasswordTS.apply).toHaveBeenCalledWith(999, "user123");
      expect(fetchPasswordResponder.apply).not.toHaveBeenCalled();
    });
  });
});
