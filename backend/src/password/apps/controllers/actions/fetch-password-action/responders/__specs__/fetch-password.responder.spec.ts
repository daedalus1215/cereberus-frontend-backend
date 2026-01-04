import { Test, TestingModule } from "@nestjs/testing";
import { FetchPasswordResponder } from "../fetch-password.responder";
import { EncryptionAdapter } from "../../../../../../infra/encryption/encryption.adapter";
import { Password } from "../../../../../../domain/entities/password.entity";
import { PasswordResponseDto } from "../../../shared/dtos/responses/password.response.dto";

describe("FetchPasswordResponder", () => {
  let target: FetchPasswordResponder;
  let encryptionAdapter: jest.Mocked<EncryptionAdapter>;

  beforeEach(async () => {
    const mockEncryptionAdapter = {
      decrypt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FetchPasswordResponder,
        {
          provide: EncryptionAdapter,
          useValue: mockEncryptionAdapter,
        },
      ],
    }).compile();

    target = module.get<FetchPasswordResponder>(FetchPasswordResponder);
    encryptionAdapter = module.get(EncryptionAdapter);
  });

  describe("apply", () => {
    it("should return converted password DTO when password exists", () => {
      const createdDate = new Date();
      const lastModifiedDate = new Date();
      const encryptedPassword = "encrypted:password";
      const decryptedPassword = "decryptedpassword";

      const mockPassword: Password = {
        id: 1,
        name: "Test Password",
        username: "testuser",
        password: encryptedPassword,
        userId: "user123",
        createdDate,
        lastModifiedDate,
        tags: [],
      };

      encryptionAdapter.decrypt.mockReturnValue(decryptedPassword);

      const result = target.apply(mockPassword);

      expect(result).toBeInstanceOf(PasswordResponseDto);
      expect(result).toEqual({
        id: 1,
        name: "Test Password",
        username: "testuser",
        password: decryptedPassword,
        userId: "user123",
        createdDate,
        lastModifiedDate,
        tags: [],
      });
      expect(encryptionAdapter.decrypt).toHaveBeenCalledWith(encryptedPassword);
    });

    it("should return null when password is null", () => {
      const result = target.apply(null);

      expect(result).toBeNull();
      expect(encryptionAdapter.decrypt).not.toHaveBeenCalled();
    });
  });
});
