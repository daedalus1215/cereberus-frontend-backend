import { Injectable } from "@nestjs/common";
import { PasswordToDtoConverter } from "src/password/apps/controllers/actions/shared/converters/password-to-dto.converter";
import { PasswordResponseDto } from "src/password/apps/controllers/actions/shared/dtos/responses/password.response.dto";
import { Password } from "src/password/domain/entities/password.entity";
import { EncryptionAdapter } from "src/password/infra/encryption/encryption.adapter";

@Injectable()
export class FetchPasswordResponder {
  constructor(private readonly encryption: EncryptionAdapter) {}

  apply(password: Password | null): PasswordResponseDto | null {
    if (!password) {
      return null;
    }
    return new PasswordResponseDto({
      ...password,
      password: this.encryption.decrypt(password.password),
      tags: password.tags?.map((tag) => ({ id: tag.id, name: tag.name })) || [],
    });
  }
}
