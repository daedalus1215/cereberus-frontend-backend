import { Injectable, NotFoundException } from "@nestjs/common";
import { PasswordRepositoryImpl } from "../../infra/repositories/password.repository.impl";

@Injectable()
export class DeletePasswordTransactionScript {
  constructor(private readonly passwordRepo: PasswordRepositoryImpl) {}

  async apply(userId: string, id: number): Promise<void> {
    const password = await this.passwordRepo.findByIdAndUser(id, userId);
    if (!password) {
      throw new NotFoundException("Password not found");
    }
    await this.passwordRepo.delete(id, userId);
  }
}

