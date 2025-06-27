import { Test, TestingModule } from '@nestjs/testing';
import { FetchPasswordResponder } from '../fetch-password.responder';
import { PasswordToDtoConverter } from '../../../shared/converters/password-to-dto.converter';
import { Password } from '../../../../../../domain/entities/password.entity';
import { PasswordResponseDto } from '../../../shared/dtos/responses/password.response.dto';

describe('FetchPasswordResponder', () => {
  let target: FetchPasswordResponder;
  let passwordToDtoConverter: jest.Mocked<PasswordToDtoConverter>;

  beforeEach(async () => {
    const mockPasswordToDtoConverter = {
      apply: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FetchPasswordResponder,
        {
          provide: PasswordToDtoConverter,
          useValue: mockPasswordToDtoConverter,
        },
      ],
    }).compile();

    target = module.get<FetchPasswordResponder>(FetchPasswordResponder);
    passwordToDtoConverter = module.get(PasswordToDtoConverter);
  });

  describe('apply', () => {
    it('should return converted password DTO when password exists', () => {
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

      const mockResponseDto = new PasswordResponseDto({
        id: 1,
        name: 'Test Password',
        username: 'testuser',
        password: 'testpass',
        createdDate: new Date(),
        lastModifiedDate: new Date(),
        tags: [],
      });

      passwordToDtoConverter.apply.mockReturnValue(mockResponseDto);

      const result = target.apply(mockPassword);

      expect(result).toEqual(mockResponseDto);
      expect(passwordToDtoConverter.apply).toHaveBeenCalledWith(mockPassword);
    });

    it('should return null when password is null', () => {
      const result = target.apply(null);

      expect(result).toBeNull();
      expect(passwordToDtoConverter.apply).not.toHaveBeenCalled();
    });
  });
}); 