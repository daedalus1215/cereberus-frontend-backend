import * as bcrypt from "bcrypt";
import { CreateUserDto } from "../app/dtos/requests/create-user.dto";
import { User } from "./entities/user.entity";
import { UserRepository } from "../infra/repositories/user.repository";
import { ConflictException, Injectable } from "@nestjs/common";
import { omit } from "lodash";

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

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
