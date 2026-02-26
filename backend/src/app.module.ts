import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { UsersModule } from "./users/users.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./users/domain/entities/user.entity";
import { PasswordModule } from "./password/password.module";
import { Password } from "./password/domain/entities/password.entity";
import { Tag } from "./password/domain/entities/tag.entity";
import { SecurityEvent } from "./security-events/domain/entities/security-event.entity";
import { SecurityEventsModule } from "./security-events/security-events.module";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", `.env.${process.env.NODE_ENV}`],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: "sqlite",
        database: configService.get<string>("DATABASE"),
        entities: [User, Password, Tag, SecurityEvent],
        synchronize: false,
        runMigrations: true,
      }),
      inject: [ConfigService],
    }),
    SecurityEventsModule,
    UsersModule,
    AuthModule,
    PasswordModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
