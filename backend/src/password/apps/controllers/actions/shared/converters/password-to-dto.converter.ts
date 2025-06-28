import { Injectable } from "@nestjs/common";
import { Password } from "../../../../../domain/entities/password.entity";
import { PasswordResponseDto } from "../dtos/responses/password.response.dto";
import { EncryptionAdapter } from 'src/password/infra/encryption/encryption.adapter';

@Injectable()
export class PasswordToDtoConverter {
  constructor(private readonly encryption: EncryptionAdapter) {}

  apply(password: Password): PasswordResponseDto {
    return new PasswordResponseDto({
        ...password,
        // password: this.encryption.decrypt(password.password),
      tags: password.tags?.map(tag => ({id: tag.id, name: tag.name})) || [],
    });
  }
}