import { Injectable } from '@nestjs/common';
import { PasswordRepositoryImpl } from '../../infra/repositories/password.repository.impl';
import { PasswordEncryptionService } from '../services/password-encryption.service';
import { PasswordResponseDto } from '../../apps/dtos/responses/password.response.dto';

@Injectable()
export class GetPasswordsTransactionScript {
  constructor(
    private readonly passwordRepo: PasswordRepositoryImpl,
    private readonly encryption: PasswordEncryptionService
  ) {}

  async execute(userId: number): Promise<PasswordResponseDto[]> {
    const passwords = await this.passwordRepo.findAllByUser(userId);
    return passwords.map(pw => new PasswordResponseDto({
      id: pw.id,
      name: pw.name,
      username: pw.username,
      password: this.encryption.decrypt(pw.password),
      created_date: pw.created_date,
      last_modified_date: pw.last_modified_date,
      tagIds: pw.tags?.map(tag => tag.id) || []
    }));
  }
} 