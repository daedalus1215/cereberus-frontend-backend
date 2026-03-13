import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { UserRepository } from "../../../infra/repositories/user.repository";
import type { UpdateUsernameCommand } from "./update-username.command";
import * as bcrypt from "bcrypt";
import { omit } from "lodash";
import type { User } from "../../entities/user.entity";

const MIN_USERNAME_LENGTH = 4;
const MAX_USERNAME_LENGTH = 20;

/**
 * Transaction script for updating a user's username.
 * Verifies current password and checks for username uniqueness.
 */
@Injectable()
export class UpdateUsernameTransactionScript {
  constructor(private readonly userRepository: UserRepository) {}

  async apply(command: UpdateUsernameCommand): Promise<Omit<User, "password">> {
    const { userId, newUsername, currentPassword, user } = command;
    if (user.userId !== userId) {
      throw new UnauthorizedException("Cannot update another user's account");
    }
    if (
      !newUsername ||
      newUsername.length < MIN_USERNAME_LENGTH ||
      newUsername.length > MAX_USERNAME_LENGTH
    ) {
      throw new Error(
        `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters`,
      );
    }
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      existingUser.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    if (existingUser.username === newUsername) {
      throw new Error("New username must be different from current username");
    }
    const userWithSameUsername =
      await this.userRepository.findByUsername(newUsername);
    if (userWithSameUsername) {
      throw new ConflictException("Username already exists");
    }
    const updatedUser = await this.userRepository.update(Number(userId), {
      username: newUsername,
    });
    return omit(updatedUser, ["password"]);
  }
}
