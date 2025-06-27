import { Controller, Get, UseGuards } from '@nestjs/common';
import { FetchPasswordsTransactionScript } from '../../../../domain/transaction-scripts/fetch-passwords.transaction.script';
import { PasswordResponseDto } from '../shared/dtos/responses/password.response.dto';
import { GetAuthUser, AuthUser } from 'src/auth/app/decorators/get-auth-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FetchPasswordsResponder } from './responders/fetch-passwords.responder';

@Controller('passwords')
@UseGuards(JwtAuthGuard)
export class FetchPasswordsAction {
  constructor(
    private readonly getPasswordsTS: FetchPasswordsTransactionScript,
    private readonly fetchPasswordsResponder: FetchPasswordsResponder
  ) {}

  @Get()
  async handle(@GetAuthUser() user: AuthUser): Promise<PasswordResponseDto[]> {
    return this.fetchPasswordsResponder.apply(await this.getPasswordsTS.apply(user?.userId));
  }
} 