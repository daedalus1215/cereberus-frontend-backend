import {
  Put,
  Body,
  Controller,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { UsersService } from "../../../domain/users.service";
import {
  AuthUser,
  GetAuthUser,
} from "src/auth/app/decorators/get-auth-user.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { UpdateUsernameDto } from "./dtos/requests/update-username.dto";
import type { UpdateUsernameCommand } from "../../../domain/transaction-scripts/update-username-TS/update-username.command";

/**
 * Action handler for updating username.
 * Handles PUT /users/username requests.
 */
@Controller("users")
@UseGuards(JwtAuthGuard)
export class UpdateUsernameAction {
  constructor(private readonly usersService: UsersService) {}

  @Put("username")
  @HttpCode(HttpStatus.OK)
  async apply(
    @Body() dto: UpdateUsernameDto,
    @GetAuthUser() user: AuthUser,
  ) {
    const command: UpdateUsernameCommand = {
      userId: user.userId,
      newUsername: dto.newUsername,
      currentPassword: dto.currentPassword,
      user,
    };
    return this.usersService.updateUsername(command);
  }
}
