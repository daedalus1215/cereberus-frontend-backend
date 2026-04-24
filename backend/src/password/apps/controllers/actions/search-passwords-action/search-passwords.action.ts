import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { GetAuthUser, AuthUser } from "src/auth/app/decorators/get-auth-user.decorator";
import { SearchPasswordsTransactionScript } from "../../../../domain/transaction-scripts/search-passwords.transaction.script";
import { PasswordResponseDto } from "../shared/dtos/responses/password.response.dto";
import { SearchPasswordsDto } from "./dtos/requests/search-passwords.dto";
import { SearchPasswordsResponder } from "./responders/search-passwords.responder";

@Controller("passwords")
@UseGuards(JwtAuthGuard)
export class SearchPasswordsAction {
  constructor(
    private readonly searchTs: SearchPasswordsTransactionScript,
    private readonly responder: SearchPasswordsResponder,
  ) {}

  @Get("search")
  async handle(
    @GetAuthUser() user: AuthUser,
    @Query() dto: SearchPasswordsDto,
  ): Promise<PasswordResponseDto[]> {
    return this.responder.apply(
      await this.searchTs.apply(user?.userId, dto.query || ""),
    );
  }
}
