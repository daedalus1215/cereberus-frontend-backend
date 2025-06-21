import { Injectable, NotFoundException } from '@nestjs/common';
import { PasswordRepositoryImpl } from '../../infra/repositories/password.repository.impl';
import { TagRepositoryImpl } from '../../infra/repositories/tag.repository.impl';
import { AddPasswordDto } from '../../apps/dtos/requests/add-password.dto';
import { PasswordResponseDto } from '../../apps/dtos/responses/password.response.dto';
import { Password } from '../entities/password.entity';
import { EncryptionAdapter } from '../../infra/encryption/encryption.adapter';

@Injectable()
export class AddPasswordTransactionScript {
  constructor(
    private readonly passwordRepo: PasswordRepositoryImpl,
    private readonly tagRepo: TagRepositoryImpl,
    private readonly encryption: EncryptionAdapter
  ) {}

  async execute(userId: string, dto: AddPasswordDto): Promise<PasswordResponseDto> {
    let tags = [];
    if (dto.tagIds && dto.tagIds.length > 0) {
      tags = await this.tagRepo.findByIds(dto.tagIds);
      if (tags.length !== dto.tagIds.length) {
        throw new NotFoundException('One or more tags not found');
      }
    }
    const password = new Password();
    password.name = dto.name;
    password.username = dto.username;
    password.password = this.encryption.encrypt(dto.password);
    password.user_id = userId;
    password.tags = tags;
    password.url = dto.url;
    const saved = await this.passwordRepo.save(password);


    return new PasswordResponseDto({
      id: saved.id,
      name: saved.name,
      username: saved.username,
      password: dto.password, // return plain password
      created_date: saved.created_date,
      last_modified_date: saved.last_modified_date,
      tags: saved.tags?.map(tag => ({id: tag.id, name: tag.name})) || []
    });
  }
} 