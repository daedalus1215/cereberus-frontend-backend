import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Password } from "./domain/entities/password.entity";
import { Tag } from "./domain/entities/tag.entity";
import { PasswordRepositoryImpl } from "./infra/repositories/password.repository.impl";
import { TagRepositoryImpl } from "./infra/repositories/tag.repository.impl";
import { FetchPasswordsTransactionScript } from "./domain/transaction-scripts/fetch-passwords.transaction.script";
import { FetchPasswordTransactionScript } from "./domain/transaction-scripts/fetch-password.transaction.script";
import { AddPasswordTransactionScript } from "./domain/transaction-scripts/add-password.transaction.script";
import { UpdatePasswordTransactionScript } from "./domain/transaction-scripts/update-password.transaction.script";
import { AddPasswordAction } from "./apps/controllers/actions/add-password-action/add-password.action";
import { FetchPasswordsAction } from "./apps/controllers/actions/fetch-passwords-action/fetch-passwords.action";
import { FetchPasswordAction } from "./apps/controllers/actions/fetch-password-action/fetch-password.action";
import { UpdatePasswordAction } from "./apps/controllers/actions/update-password-action/update-password.action";
import { AuthModule } from "src/auth/auth.module";
import { EncryptionAdapter } from "./infra/encryption/encryption.adapter";
import { ConfigService } from "@nestjs/config";
import { FetchPasswordsResponder } from "./apps/controllers/actions/fetch-passwords-action/responders/fetch-passwords.responder";
import { FetchPasswordResponder } from "./apps/controllers/actions/fetch-password-action/responders/fetch-password.responder";
import { PasswordToDtoConverter } from "./apps/controllers/actions/shared/converters/password-to-dto.converter";

@Module({
  imports: [TypeOrmModule.forFeature([Password, Tag]), AuthModule],
  providers: [
    PasswordRepositoryImpl,
    TagRepositoryImpl,
    {
      provide: EncryptionAdapter,
      useFactory: (configService: ConfigService) =>
        new EncryptionAdapter(
          configService.get<string>("ENCRYPTION_KEY"),
          configService.get<string>("ENCRYPTION_SALT"),
        ),
      inject: [ConfigService],
    },
    FetchPasswordsTransactionScript,
    FetchPasswordTransactionScript,
    AddPasswordTransactionScript,
    UpdatePasswordTransactionScript,
    FetchPasswordsResponder,
    FetchPasswordResponder,
    PasswordToDtoConverter,
  ],
  controllers: [
    AddPasswordAction,
    FetchPasswordsAction,
    FetchPasswordAction,
    UpdatePasswordAction,
  ],
})
export class PasswordModule {}
