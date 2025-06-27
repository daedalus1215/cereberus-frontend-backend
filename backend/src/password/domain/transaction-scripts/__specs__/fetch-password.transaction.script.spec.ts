import { Test, TestingModule } from '@nestjs/testing';
import { FetchPasswordTransactionScript } from '../fetch-password.transaction.script';
import { PasswordRepositoryImpl } from '../../../infra/repositories/password.repository.impl';
import { Password } from '../../entities/password.entity';

describe('FetchPasswordTransactionScript', () => {
  let target: FetchPasswordTransactionScript;
  let passwordRepo: jest.Mocked<PasswordRepositoryImpl>;

  beforeEach(async () => {
    const mockPasswordRepo = {
      findByIdAndUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FetchPasswordTransactionScript,
        {
          provide: PasswordRepositoryImpl,
          useValue: mockPasswordRepo,
        },
      ],
    }).compile();

    target = module.get<FetchPasswordTransactionScript>(FetchPasswordTransactionScript);
    passwordRepo = module.get(PasswordRepositoryImpl);
  });

  describe('apply', () => {
    it('should return password when found', async () => {
      const mockPassword: Password = {
        id: 1,
        name: 'Test Password',
        username: 'testuser',
        password: 'testpass',
        userId: 'user123',
        createdDate: new Date(),
        lastModifiedDate: new Date(),
        tags: [],
      };

      passwordRepo.findByIdAndUser.mockResolvedValue(mockPassword);

      const result = await target.apply(1, 'user123');

      expect(result).toEqual(mockPassword);
      expect(passwordRepo.findByIdAndUser).toHaveBeenCalledWith(1, 'user123');
    });

    it('should return null when password not found', async () => {
      passwordRepo.findByIdAndUser.mockResolvedValue(null);

      const result = await target.apply(999, 'user123');

      expect(result).toBeNull();
      expect(passwordRepo.findByIdAndUser).toHaveBeenCalledWith(999, 'user123');
    });
  });
}); 