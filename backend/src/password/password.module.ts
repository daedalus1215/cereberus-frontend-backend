import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Password } from './domain/entities/password.entity';
import { Tag } from './domain/entities/tag.entity';
import { PasswordRepositoryImpl } from './infra/repositories/password.repository.impl';
import { TagRepositoryImpl } from './infra/repositories/tag.repository.impl';
import { FetchPasswordsTransactionScript } from './domain/transaction-scripts/fetch-passwords.transaction.script';
import { AddPasswordTransactionScript } from './domain/transaction-scripts/add-password.transaction.script';
import { UpdatePasswordTransactionScript } from './domain/transaction-scripts/update-password.transaction.script';
import { PasswordEncryptionService } from './domain/services/password-encryption.service';
import { PasswordActions } from './apps/actions/password.actions';

@Module({
  imports: [TypeOrmModule.forFeature([Password, Tag])],
  providers: [
    PasswordRepositoryImpl,
    TagRepositoryImpl,
    FetchPasswordsTransactionScript,
    AddPasswordTransactionScript,
    UpdatePasswordTransactionScript,
    PasswordEncryptionService,
  ],
  controllers: [PasswordActions],
})
export class PasswordModule {} 