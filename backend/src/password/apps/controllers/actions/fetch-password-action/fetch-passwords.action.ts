import { Controller, Get, UseGuards } from '@nestjs/common';
import { FetchPasswordsTransactionScript } from '../../../../domain/transaction-scripts/fetch-passwords.transaction.script';
import { PasswordResponseDto } from '../shared/dtos/responses/password.response.dto';
import { GetAuthUser, AuthUser } from 'src/auth/app/decorators/get-auth-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('passwords')
@UseGuards(JwtAuthGuard)
export class FetchPasswordsAction {
  constructor(
    private readonly fetchPasswordsTS: FetchPasswordsTransactionScript,
  ) {}

  @Get()
  async apply(@GetAuthUser() user: AuthUser): Promise<PasswordResponseDto[]> {
    return this.fetchPasswordsTS.apply(user?.userId);
  }
} 