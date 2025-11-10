import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./domain/users.service";
import { UsersController } from "./app/controllers/users.controller";
import { User } from "./domain/entities/user.entity";
import { ConfigModule } from "@nestjs/config";
import { UserRepository } from "./infra/repositories/user.repository";

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  providers: [UsersService, UserRepository],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
