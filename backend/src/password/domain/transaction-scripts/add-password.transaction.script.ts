import { Injectable, NotFoundException } from '@nestjs/common';
import { PasswordRepository } from '../repositories/password.repository';
import { TagRepository } from '../repositories/tag.repository';
import { PasswordEncryptionService } from '../services/password-encryption.service';
import { AddPasswordDto } from '../../apps/dtos/requests/add-password.dto';
import { PasswordResponseDto } from '../../apps/dtos/responses/password.response.dto';
import { Password } from '../entities/password.entity';

@Injectable()
export class AddPasswordTransactionScript {
  constructor(
    private readonly passwordRepo: PasswordRepository,
    private readonly tagRepo: TagRepository,
    private readonly encryption: PasswordEncryptionService
  ) {}

  async execute(userId: number, dto: AddPasswordDto): Promise<PasswordResponseDto> {
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
    const saved = await this.passwordRepo.save(password);
    return new PasswordResponseDto({
      id: saved.id,
      name: saved.name,
      username: saved.username,
      password: dto.password, // return plain password
      created_date: saved.created_date,
      last_modified_date: saved.last_modified_date,
      tagIds: saved.tags?.map(tag => tag.id) || []
    });
  }
} 