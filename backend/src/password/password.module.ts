import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Password } from './domain/entities/password.entity';
import { Tag } from './domain/entities/tag.entity';
import { PasswordRepositoryImpl } from './infra/repositories/password.repository.impl';
import { TagRepositoryImpl } from './infra/repositories/tag.repository.impl';
import { FetchPasswordsTransactionScript } from './domain/transaction-scripts/fetch-passwords.transaction.script';
import { AddPasswordTransactionScript } from './domain/transaction-scripts/add-password.transaction.script';
import { UpdatePasswordTransactionScript } from './domain/transaction-scripts/update-password.transaction.script';
import { PasswordController } from './apps/controllers/password.controller';
import { AuthModule } from 'src/auth/auth.module';
import { EncryptionAdapter } from './infra/encryption/encryption.adapter';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Password, Tag]),
    AuthModule,
  ],
  providers: [
    PasswordRepositoryImpl,
    TagRepositoryImpl,
    {
      provide: EncryptionAdapter,
      useFactory: (configService: ConfigService) => new EncryptionAdapter(configService.get<string>('ENCRYPTION_KEY'), configService.get<string>('ENCRYPTION_SALT')),
      inject: [ConfigService],
    },
    FetchPasswordsTransactionScript,
    AddPasswordTransactionScript,
    UpdatePasswordTransactionScript,
  ],
  controllers: [PasswordController],
})
export class PasswordModule {} 