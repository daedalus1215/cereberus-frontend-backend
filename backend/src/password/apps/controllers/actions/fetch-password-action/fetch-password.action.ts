import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { FetchPasswordTransactionScript } from "../../../../domain/transaction-scripts/fetch-password.transaction.script";
import { FetchPasswordResponder } from "./responders/fetch-password.responder";
import { PasswordResponseDto } from "../shared/dtos/responses/password.response.dto";
import {
  GetAuthUser,
  AuthUser,
} from "src/auth/app/decorators/get-auth-user.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";

@Controller("passwords")
@UseGuards(JwtAuthGuard)
export class FetchPasswordAction {
  constructor(
    private readonly fetchPasswordTS: FetchPasswordTransactionScript,
    private readonly fetchPasswordResponder: FetchPasswordResponder,
  ) {}

  @Get(":id")
  async apply(
    @Param("id", ParseIntPipe) id: number,
    @GetAuthUser() user: AuthUser,
  ): Promise<PasswordResponseDto> {
    const password = await this.fetchPasswordTS.apply(id, user?.userId);

    if (!password) {
      throw new NotFoundException(`Password with ID ${id} not found`);
    }

    return this.fetchPasswordResponder.apply(password);
  }
}
