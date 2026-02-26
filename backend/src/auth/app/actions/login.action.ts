import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { AuthService } from "../../domain/auth.service";

@Controller("auth")
export class LoginAction {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: { username: string; password: string },
    @Req() req: Request,
  ) {
    return this.authService.attemptLogin(
      loginDto.username,
      loginDto.password,
      {
        username: loginDto.username,
        ip: req.ip ?? req.socket?.remoteAddress,
        userAgent: req.headers["user-agent"],
      },
    );
  }
}
