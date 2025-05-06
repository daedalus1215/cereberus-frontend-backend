import { Injectable, NotFoundException } from '@nestjs/common';
import { PasswordRepositoryImpl } from '../../infra/repositories/password.repository.impl';
import { TagRepositoryImpl } from '../../infra/repositories/tag.repository.impl';
import { PasswordEncryptionService } from '../services/password-encryption.service';
import { UpdatePasswordDto } from '../../apps/dtos/requests/update-password.dto';
import { PasswordResponseDto } from '../../apps/dtos/responses/password.response.dto';

@Injectable()
export class UpdatePasswordTransactionScript {
  constructor(
    private readonly passwordRepo: PasswordRepositoryImpl,
    private readonly tagRepo: TagRepositoryImpl,
    private readonly encryption: PasswordEncryptionService
  ) {}

  async execute(userId: number, id: number, dto: UpdatePasswordDto): Promise<PasswordResponseDto> {
    const password = await this.passwordRepo.findByIdAndUser(id, userId);
    if (!password) throw new NotFoundException('Password not found');

    if (dto.name !== undefined) password.name = dto.name;
    if (dto.username !== undefined) password.username = dto.username;
    if (dto.password !== undefined) password.password = this.encryption.encrypt(dto.password);
    if (dto.tagIds !== undefined) {
      const tags = await this.tagRepo.findByIds(dto.tagIds);
      if (tags.length !== dto.tagIds.length) {
        throw new NotFoundException('One or more tags not found');
      }
      password.tags = tags;
    }
    // last_modified_date will be updated automatically by TypeORM
    const saved = await this.passwordRepo.update(password);
    return new PasswordResponseDto({
      id: saved.id,
      name: saved.name,
      username: saved.username,
      password: dto.password ?? this.encryption.decrypt(saved.password),
      created_date: saved.created_date,
      last_modified_date: saved.last_modified_date,
      tagIds: saved.tags?.map(tag => tag.id) || []
    });
  }
} 