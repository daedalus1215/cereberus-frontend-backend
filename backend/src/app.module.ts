import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/domain/entities/user.entity';
import { PasswordModule } from './password/password.module';
import { Password } from './password/domain/entities/password.entity';
import { Tag } from './password/domain/entities/tag.entity';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60, // time to live (seconds)
      limit: 10, // max requests per ttl per IP
    }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get<string>('DATABASE'),
        entities: [User, Password, Tag],
        synchronize: false,
        runMigrations: true,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    PasswordModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
