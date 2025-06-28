import { Injectable } from "@nestjs/common";
import { PasswordRepositoryImpl } from "../../infra/repositories/password.repository.impl";
import { Password } from "../entities/password.entity";

@Injectable()
export class FetchPasswordTransactionScript {
  constructor(private readonly passwordRepo: PasswordRepositoryImpl) {}

  async apply(id: number, userId: string): Promise<Password | null> {
    return this.passwordRepo.findByIdAndUser(id, userId);
  }
}
