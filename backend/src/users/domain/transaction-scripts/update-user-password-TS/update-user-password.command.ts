import type { AuthUser } from "src/auth/app/decorators/get-auth-user.decorator";

export type UpdateUserPasswordCommand = {
  readonly userId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly user: AuthUser;
};
