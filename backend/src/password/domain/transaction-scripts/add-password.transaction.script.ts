import { Injectable, NotFoundException } from "@nestjs/common";
import { PasswordRepositoryImpl } from "../../infra/repositories/password.repository.impl";
import { TagRepositoryImpl } from "../../infra/repositories/tag.repository.impl";
import { AddPasswordDto } from "../../apps/controllers/actions/add-password-action/dtos/requests/add-password.dto";
import { Password } from "../entities/password.entity";
import { EncryptionAdapter } from "../../infra/encryption/encryption.adapter";
import { Tag } from "../entities/tag.entity";

@Injectable()
export class AddPasswordTransactionScript {
  constructor(
    private readonly passwordRepo: PasswordRepositoryImpl,
    private readonly tagRepo: TagRepositoryImpl,
    private readonly encryption: EncryptionAdapter,
  ) {}

  async apply(userId: string, dto: AddPasswordDto): Promise<Password> {
    //@TODO: Move to converter to get SRP effect
    const password = new Password();

    password.name = dto.name;
    password.username = dto.username;
    password.password = this.encryption.encrypt(dto.password);
    password.userId = userId;
    password.tags = await this.getTags(dto.tagIds);
    password.url = dto.url;
    password.notes = dto.notes;

    return await this.passwordRepo.save(password);
  }

  private async getTags(tagIds: number[]): Promise<Tag[]> {
    if (tagIds && tagIds.length > 0) {
      const tags = await this.tagRepo.findByIds(tagIds);
      if (tags.length !== tagIds.length) {
        throw new NotFoundException("One or more tags not found");
      }
      return tags;
    }
    return [];
  }
}
