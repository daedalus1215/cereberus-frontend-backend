import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./domain/users.service";
import { UsersController } from "./app/controllers/users.controller";
import { User } from "./domain/entities/user.entity";
import { ConfigModule } from "@nestjs/config";
import { UserRepository } from "./infra/repositories/user.repository";
import { SecurityEventsModule } from "src/security-events/security-events.module";
import { UpdateUserPasswordTransactionScript } from "./domain/transaction-scripts/update-user-password-TS/update-user-password.transaction.script";
import { UpdateUsernameTransactionScript } from "./domain/transaction-scripts/update-username-TS/update-username.transaction.script";
import { UpdateUserPasswordAction } from "./app/actions/update-user-password-action/update-user-password.action";
import { UpdateUsernameAction } from "./app/actions/update-username-action/update-username.action";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    SecurityEventsModule,
  ],
  providers: [
    UsersService,
    UserRepository,
    UpdateUserPasswordTransactionScript,
    UpdateUsernameTransactionScript,
  ],
  controllers: [UsersController, UpdateUserPasswordAction, UpdateUsernameAction],
  exports: [UsersService],
})
export class UsersModule {}
