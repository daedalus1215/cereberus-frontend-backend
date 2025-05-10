import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { FetchPasswordsTransactionScript } from '../../domain/transaction-scripts/fetch-passwords.transaction.script';
import { AddPasswordTransactionScript } from '../../domain/transaction-scripts/add-password.transaction.script';
import { UpdatePasswordTransactionScript } from '../../domain/transaction-scripts/update-password.transaction.script';
import { AddPasswordDto } from '../dtos/requests/add-password.dto';
import { UpdatePasswordDto } from '../dtos/requests/update-password.dto';
import { PasswordResponseDto } from '../dtos/responses/password.response.dto';
import { GetAuthUser } from 'src/auth/app/decorators/get-auth-user.decorator';
import { AuthUser } from 'src/auth/app/decorators/get-auth-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('passwords')
@UseGuards(JwtAuthGuard)
export class PasswordController {
  constructor(
    private readonly getPasswordsTS: FetchPasswordsTransactionScript,
    private readonly addPasswordTS: AddPasswordTransactionScript,
    private readonly updatePasswordTS: UpdatePasswordTransactionScript
  ) {}

  @Get()
  async getAll(@GetAuthUser() user: AuthUser): Promise<PasswordResponseDto[]> {
    return this.getPasswordsTS.execute(user?.userId);
  }

  @Post()
  async add(
    @Body() dto: AddPasswordDto,
    @GetAuthUser() user: AuthUser
  ): Promise<PasswordResponseDto> {
    return this.addPasswordTS.execute(user?.userId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePasswordDto,
    @GetAuthUser() user: AuthUser
  ): Promise<PasswordResponseDto> {
    return this.updatePasswordTS.execute(user.userId, parseInt(id, 10), dto);
  }
} 