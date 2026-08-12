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
import { HealthController } from "./health/health.controller";

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
        type: "postgres",
        host: configService.get<string>("DB_HOST"),
        port: Number(configService.get<string>("DB_PORT") ?? 5432),
        username: configService.get<string>("DB_USER"),
        password: configService.get<string>("DB_PASSWORD"),
        database: configService.get<string>("DB_NAME"),
        entities: [User, Password, Tag, SecurityEvent],
        // ⚠️ was `runMigrations: true`, which is NOT a TypeORM option — it was silently
        // ignored, and with no `migrations` path configured either, migrations have never
        // run automatically on this app. Both fixed here.
        migrations: [__dirname + "/typeorm/migrations/*{.ts,.js}"],
        migrationsRun: true,
        synchronize: false,
        logging: configService.get<string>("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),
    SecurityEventsModule,
    UsersModule,
    AuthModule,
    PasswordModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
