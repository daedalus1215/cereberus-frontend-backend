import { Module } from "@nestjs/common";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import type { StringValue } from "ms";
import { JwtStrategy } from "./jwt.strategy";
import { AuthService } from "./domain/auth.service";
import { LoginAction } from "./app/actions/login.action";
import { UsersModule } from "src/users/users.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => {
        const expiresIn = configService.get<string>("JWT_EXPIRES_IN") || "1min";
        return {
          secret: configService.get<string>("JWT_SECRET"),
          signOptions: {
            expiresIn: expiresIn as StringValue,
          },
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [LoginAction],
  exports: [AuthService],
})
export class AuthModule {}
