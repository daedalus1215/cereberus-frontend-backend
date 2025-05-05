import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { GetPasswordsTransactionScript } from '../../domain/transaction-scripts/get-passwords.transaction.script';
import { AddPasswordTransactionScript } from '../../domain/transaction-scripts/add-password.transaction.script';
import { UpdatePasswordTransactionScript } from '../../domain/transaction-scripts/update-password.transaction.script';
import { AddPasswordDto } from '../dtos/requests/add-password.dto';
import { UpdatePasswordDto } from '../dtos/requests/update-password.dto';
import { PasswordResponseDto } from '../dtos/responses/password.response.dto';
// import { GetAuthUser } from 'src/auth/app/decorators/get-auth-user.decorator';

@Controller('passwords')
export class PasswordActions {
  constructor(
    private readonly getPasswordsTS: GetPasswordsTransactionScript,
    private readonly addPasswordTS: AddPasswordTransactionScript,
    private readonly updatePasswordTS: UpdatePasswordTransactionScript
  ) {}

  @Get()
  async getAll(/* @GetAuthUser() user */): Promise<PasswordResponseDto[]> {
    const userId = 1; // TODO: replace with user.id from auth context
    return this.getPasswordsTS.execute(userId);
  }

  @Post()
  async add(
    @Body() dto: AddPasswordDto,
    // @GetAuthUser() user
  ): Promise<PasswordResponseDto> {
    const userId = 1; // TODO: replace with user.id from auth context
    return this.addPasswordTS.execute(userId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePasswordDto,
    // @GetAuthUser() user
  ): Promise<PasswordResponseDto> {
    const userId = 1; // TODO: replace with user.id from auth context
    return this.updatePasswordTS.execute(userId, parseInt(id, 10), dto);
  }
} 