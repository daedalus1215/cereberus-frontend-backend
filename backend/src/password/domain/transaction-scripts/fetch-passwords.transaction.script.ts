import { Injectable } from '@nestjs/common';
import { PasswordRepositoryImpl } from '../../infra/repositories/password.repository.impl';
import { PasswordResponseDto } from '../../apps/dtos/responses/password.response.dto';
import { EncryptionAdapter } from '../../infra/encryption/encryption.adapter';

@Injectable()
export class FetchPasswordsTransactionScript {
  constructor(
    private readonly passwordRepo: PasswordRepositoryImpl,
    private readonly encryption: EncryptionAdapter
  ) {}

  async execute(userId: string): Promise<PasswordResponseDto[]> {
    const passwords = await this.passwordRepo.findAllByUser(userId);
    //@TODO: Move converter to app level
    return passwords.map(pw => new PasswordResponseDto({
      id: pw.id,
      name: pw.name,
      username: pw.username,
      password: this.encryption.decrypt(pw.password),
      created_date: pw.created_date,
      last_modified_date: pw.last_modified_date,
      tags: pw.tags,
      url: pw.url
    }));
  }
} 