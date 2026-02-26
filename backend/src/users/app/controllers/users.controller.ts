import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { UsersService } from "src/users/domain/users.service";
import { CreateUserDto } from "../dtos/requests/create-user.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  getProfile(@Req() req) {
    return req.user;
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request,
  ) {
    return this.usersService.register(createUserDto, {
      ip: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers["user-agent"],
    });
  }
}
