import { Injectable } from '@nestjs/common';
import { PasswordRepositoryImpl } from '../../infra/repositories/password.repository.impl';
import { EncryptionAdapter } from '../../infra/encryption/encryption.adapter';
import { Password } from '../entities/password.entity';

@Injectable()
export class FetchPasswordsTransactionScript {
  constructor(
    private readonly passwordRepo: PasswordRepositoryImpl,
    private readonly encryption: EncryptionAdapter
  ) {}

  async execute(userId: string): Promise<Password[]> {
    const passwords = await this.passwordRepo.findAllByUser(userId);
    return passwords.map(pw => ({
      ...pw,
      password: this.encryption.decrypt(pw.password),
    }));
  }
} 