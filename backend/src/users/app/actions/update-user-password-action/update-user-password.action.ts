import {
  Put,
  Body,
  Controller,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { UsersService } from "../../../domain/users.service";
import {
  AuthUser,
  GetAuthUser,
} from "src/auth/app/decorators/get-auth-user.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { UpdateUserPasswordDto } from "./dtos/requests/update-user-password.dto";
import type { UpdateUserPasswordCommand } from "../../../domain/transaction-scripts/update-user-password-TS/update-user-password.command";

/**
 * Action handler for updating user account password.
 * Handles PUT /users/password requests.
 */
@Controller("users")
@UseGuards(JwtAuthGuard)
export class UpdateUserPasswordAction {
  constructor(private readonly usersService: UsersService) {}

  @Put("password")
  @HttpCode(HttpStatus.OK)
  async apply(
    @Body() dto: UpdateUserPasswordDto,
    @GetAuthUser() user: AuthUser,
  ) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        "New password and confirmation password do not match",
      );
    }
    const command: UpdateUserPasswordCommand = {
      userId: user.userId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      user,
    };
    await this.usersService.updateUserPassword(command);
    return { success: true };
  }
}
