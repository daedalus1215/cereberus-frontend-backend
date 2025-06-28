import { Injectable } from "@nestjs/common";
import { PasswordToDtoConverter } from "src/password/apps/controllers/actions/shared/converters/password-to-dto.converter";
import { PasswordResponseDto } from "src/password/apps/controllers/actions/shared/dtos/responses/password.response.dto";
import { Password } from "src/password/domain/entities/password.entity";

@Injectable()
export class FetchPasswordsResponder {
  constructor(
    private readonly passwordToDtoConverter: PasswordToDtoConverter,
  ) {}

  apply(passwords: Password[]): PasswordResponseDto[] {
    return passwords.map((pw) => this.passwordToDtoConverter.apply(pw));
  }
}
