import { Injectable } from "@nestjs/common";
import { PasswordToDtoConverter } from "src/password/apps/controllers/actions/shared/converters/password-to-dto.converter";
import { PasswordResponseDto } from "src/password/apps/controllers/actions/shared/dtos/responses/password.response.dto";
import { Password } from "src/password/domain/entities/password.entity";

@Injectable()
export class FetchPasswordResponder {
  constructor(private readonly passwordToDtoConverter: PasswordToDtoConverter) {}

  apply(password: Password | null): PasswordResponseDto | null {
    if (!password) {
      return null;
    }
    return this.passwordToDtoConverter.apply(password);
  }
} 