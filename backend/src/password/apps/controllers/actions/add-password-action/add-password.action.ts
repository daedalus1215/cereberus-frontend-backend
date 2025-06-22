import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AddPasswordTransactionScript } from '../../../../domain/transaction-scripts/add-password.transaction.script';
import { AddPasswordDto } from './dtos/requests/add-password.dto';
import { PasswordResponseDto } from '../shared/dtos/responses/password.response.dto';
import { GetAuthUser, AuthUser } from 'src/auth/app/decorators/get-auth-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('passwords')
@UseGuards(JwtAuthGuard)
export class AddPasswordAction {
  constructor(
    private readonly addPasswordTS: AddPasswordTransactionScript,
  ) {}

  @Post()
  async handle(
    @Body() dto: AddPasswordDto,
    @GetAuthUser() user: AuthUser
  ): Promise<PasswordResponseDto> {
    const saved = await this.addPasswordTS.apply(user?.userId, dto);
    
    return new PasswordResponseDto({
      id: saved.id,
      name: saved.name,
      username: saved.username,
      password: saved.password,
      createdDate: saved.createdDate,
      lastModifiedDate: saved.lastModifiedDate,
      tags: saved.tags?.map(tag => ({id: tag.id, name: tag.name})) || [],
      url: saved.url,
      notes: saved.notes
    });
  }
} 