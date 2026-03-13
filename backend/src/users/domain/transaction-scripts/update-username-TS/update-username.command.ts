import type { AuthUser } from "src/auth/app/decorators/get-auth-user.decorator";

export type UpdateUsernameCommand = {
  readonly userId: string;
  readonly newUsername: string;
  readonly currentPassword: string;
  readonly user: AuthUser;
};
