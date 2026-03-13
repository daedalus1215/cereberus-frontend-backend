import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserRepository } from "../../../infra/repositories/user.repository";
import type { UpdateUserPasswordCommand } from "./update-user-password.command";
import * as bcrypt from "bcrypt";

const BCRYPT_SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 50;

/**
 * Transaction script for updating a user's account password.
 * Verifies current password and hashes the new password.
 */
@Injectable()
export class UpdateUserPasswordTransactionScript {
  constructor(private readonly userRepository: UserRepository) {}

  async apply(command: UpdateUserPasswordCommand): Promise<void> {
    const { userId, currentPassword, newPassword, user } = command;
    if (user.userId !== userId) {
      throw new UnauthorizedException("Cannot update another user's account");
    }
    if (
      !newPassword ||
      newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > MAX_PASSWORD_LENGTH
    ) {
      throw new Error(
        `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      );
    }
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      existingUser.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    const isSamePassword = await bcrypt.compare(
      newPassword,
      existingUser.password,
    );
    if (isSamePassword) {
      throw new Error("New password must be different from current password");
    }
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(Number(userId), {
      password: hashedPassword,
    });
  }
}
