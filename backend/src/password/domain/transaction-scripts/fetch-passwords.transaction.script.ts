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

  async execute(userId: number): Promise<PasswordResponseDto[]> {
    // const passwords = await this.passwordRepo.findAllByUser(userId);

    const passwords = [{
      id: 1,
      name: "Gmail",
      username: "user1@gmail.com",
      password: "hunter2",
      created_date: new Date(),
      last_modified_date: new Date(),
      tags: [{id: 1, name: "email", user_id: 1, passwords: []}, {id: 2, name: "personal", user_id: 1, passwords: []}]
    }, {
      id: 2,
      name: "GitHub",
      username: "octocat",
      password: "s3cr3t!",
      created_date: new Date(),
      last_modified_date: new Date(),
      tags: [{id: 1, name: "dev", user_id: 1, passwords: []}, {id: 2, name: "work", user_id: 1, passwords: [] }]
    }]

    
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