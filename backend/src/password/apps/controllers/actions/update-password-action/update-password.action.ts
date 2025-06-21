import { Controller, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { UpdatePasswordTransactionScript } from "../../../../domain/transaction-scripts/update-password.transaction.script";
import { UpdatePasswordDto } from "./dtos/requests/update-password.dto";
import { PasswordResponseDto } from "../shared/dtos/responses/password.response.dto";
import {
  GetAuthUser,
  AuthUser,
} from "src/auth/app/decorators/get-auth-user.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { PasswordToDtoConverter } from "src/password/apps/controllers/actions/shared/converters/password-to-dto.converter";

@Controller("passwords")
@UseGuards(JwtAuthGuard)
export class UpdatePasswordAction {
  constructor(
    private readonly updatePasswordTS: UpdatePasswordTransactionScript,
    private readonly passwordToDtoConverter: PasswordToDtoConverter
  ) {}

  @Patch(":id")
  async apply(
    @Param("id") id: string,
    @Body() dto: UpdatePasswordDto,
    @GetAuthUser() user: AuthUser
  ): Promise<PasswordResponseDto> {
    return this.passwordToDtoConverter.apply(
      await this.updatePasswordTS.apply(user.userId, parseInt(id, 10), dto)
    );
  }
}
