import {
  Controller,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { DeletePasswordTransactionScript } from "../../../../domain/transaction-scripts/delete-password.transaction.script";
import {
  GetAuthUser,
  AuthUser,
} from "src/auth/app/decorators/get-auth-user.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";

@Controller("passwords")
@UseGuards(JwtAuthGuard)
export class DeletePasswordAction {
  constructor(
    private readonly deletePasswordTS: DeletePasswordTransactionScript,
  ) {}

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async apply(
    @Param("id") id: string,
    @GetAuthUser() user: AuthUser,
  ): Promise<void> {
    await this.deletePasswordTS.apply(user.userId, parseInt(id, 10));
  }
}

