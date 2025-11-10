import { Injectable } from "@nestjs/common";
import { PasswordRepositoryImpl } from "../../infra/repositories/password.repository.impl";
import { EncryptionAdapter } from "../../infra/encryption/encryption.adapter";
import { Password } from "../entities/password.entity";

@Injectable()
export class FetchPasswordsTransactionScript {
  constructor(private readonly passwordRepo: PasswordRepositoryImpl) {}

  async apply(userId: string): Promise<Password[]> {
    const passwords = await this.passwordRepo.findAllByUser(userId);
    return passwords.map((pw) => ({
      ...pw,
      password: pw.password.length > 0 ? "********" : null,
    }));
  }
}
