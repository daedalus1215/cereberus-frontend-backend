import { Injectable } from "@nestjs/common";
import { Password } from "../../../../../domain/entities/password.entity";
import { PasswordResponseDto } from "../dtos/responses/password.response.dto";

@Injectable()
export class PasswordToDtoConverter {
  apply(password: Password): PasswordResponseDto {
    return new PasswordResponseDto({
        ...password,
      tags: password.tags?.map(tag => ({id: tag.id, name: tag.name})) || [],
    });
  }
}