import * as bcrypt from "bcrypt";
import { CreateUserDto } from "../app/dtos/requests/create-user.dto";
import { User } from "./entities/user.entity";
import { UserRepository } from "../infra/repositories/user.repository";
import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { omit } from "lodash";
import type { DisabledRegistrationContext } from "../../security-events/domain/aggregators/security-event.aggregator";
import { SecurityEventAggregator } from "../../security-events/domain/aggregators/security-event.aggregator";

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
    private readonly securityEventAggregator: SecurityEventAggregator,
  ) {}

  /**
   * Register a new user. Checks ALLOW_REGISTRATION and logs via aggregator when disabled.
   */
  async register(
    createUserDto: CreateUserDto,
    context: DisabledRegistrationContext,
  ): Promise<Omit<User, "password">> {
    const defaultAllow =
      process.env.NODE_ENV === "production" ? "false" : "true";
    const allowRegistration = this.configService.get<string>(
      "ALLOW_REGISTRATION",
      defaultAllow,
    );
    if (allowRegistration !== "true") {
      await this.securityEventAggregator.logDisabledRegistrationAttempt(
        context,
      );
      throw new ForbiddenException("Registration is disabled");
    }
    return this.createUser(createUserDto);
  }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, "password">> {
    const { username, password: rawPassword } = createUserDto;

    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new ConflictException("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const savedUser = await this.userRepository.create({
      username,
      password: hashedPassword,
    });

    return omit(savedUser, ["password"]);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}
