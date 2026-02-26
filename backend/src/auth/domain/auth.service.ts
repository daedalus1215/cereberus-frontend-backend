import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../../users/domain/users.service";
import * as bcrypt from "bcrypt";
import { User } from "../../users/domain/entities/user.entity";
import type { FailedLoginContext } from "../../security-events/domain/aggregators/security-event.aggregator";
import { SecurityEventAggregator } from "../../security-events/domain/aggregators/security-event.aggregator";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly securityEventAggregator: SecurityEventAggregator,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, "password"> | null> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Attempt login with security event logging on failure.
   */
  async attemptLogin(
    username: string,
    password: string,
    context: FailedLoginContext,
  ): Promise<{ access_token: string }> {
    const user = await this.validateUser(username, password);
    if (!user) {
      await this.securityEventAggregator.logFailedLogin(context);
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.login(user);
  }

  async login(user: Omit<User, "password">) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
