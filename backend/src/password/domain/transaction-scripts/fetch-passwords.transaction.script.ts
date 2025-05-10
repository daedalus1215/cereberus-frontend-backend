import { Injectable } from '@nestjs/common';
import { PasswordRepositoryImpl } from '../../infra/repositories/password.repository.impl';
import { PasswordEncryptionService } from '../services/password-encryption.service';
import { PasswordResponseDto } from '../../apps/dtos/responses/password.response.dto';

@Injectable()
export class FetchPasswordsTransactionScript {
  constructor(
    private readonly passwordRepo: PasswordRepositoryImpl,
    private readonly encryption: PasswordEncryptionService
  ) {}

  async execute(userId: string): Promise<PasswordResponseDto[]> {
    const passwords = await this.passwordRepo.findAllByUser(userId);
    console.log('passwordsee', passwords);
    return passwords.map(pw => new PasswordResponseDto({
      id: pw.id,
      name: pw.name,
      username: pw.username,
      password: pw.password,
      // password: this.encryption.decrypt(pw.password),
      created_date: pw.created_date,
      last_modified_date: pw.last_modified_date,
      tags: pw.tags
    }));
  }
} 