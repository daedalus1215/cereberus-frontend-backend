import { Injectable } from "@nestjs/common";
import { PasswordRepositoryImpl } from "../../infra/repositories/password.repository.impl";
import { Password } from "../entities/password.entity";

@Injectable()
export class SearchPasswordsTransactionScript {
  constructor(private readonly passwordRepo: PasswordRepositoryImpl) {}

  async apply(userId: string, query: string): Promise<Password[]> {
    return this.passwordRepo.searchByUserWithQuery(userId, query);
  }
}
