import { Injectable, NotFoundException } from "@nestjs/common";
import { PasswordRepositoryImpl } from "../../infra/repositories/password.repository.impl";
import { TagRepositoryImpl } from "../../infra/repositories/tag.repository.impl";
import { UpdatePasswordDto } from "../../apps/controllers/actions/update-password-action/dtos/requests/update-password.dto";
import { EncryptionAdapter } from "../../infra/encryption/encryption.adapter";
import { Password } from "../entities/password.entity";

@Injectable()
export class UpdatePasswordTransactionScript {
  constructor(
    private readonly passwordRepo: PasswordRepositoryImpl,
    private readonly tagRepo: TagRepositoryImpl,
    private readonly encryption: EncryptionAdapter,
  ) {}

  async apply(
    userId: string,
    id: number,
    dto: UpdatePasswordDto,
  ): Promise<Password> {
    const password = await this.passwordRepo.findByIdAndUser(id, userId);
    if (!password) throw new NotFoundException("Password not found");

    if (dto.name !== undefined) password.name = dto.name;
    if (dto.username !== undefined) password.username = dto.username;
    if (dto.password !== undefined)
      password.password = this.encryption.encrypt(dto.password);
    if (dto.tagIds !== undefined) {
      const tags = await this.tagRepo.findByIds(dto.tagIds);
      if (tags.length !== dto.tagIds.length) {
        throw new NotFoundException("One or more tags not found");
      }
      password.tags = tags;
    }
    if (dto.notes !== undefined) password.notes = dto.notes;
    if (dto.url !== undefined) password.url = dto.url;
    // last_modified_date will be updated automatically by TypeORM
    return await this.passwordRepo.update(password);
  }
}
