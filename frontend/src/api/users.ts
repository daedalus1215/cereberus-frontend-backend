import api from "./axios.interceptor";

export type UpdatePasswordRequest = {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
};

export type UpdateUsernameRequest = {
  readonly newUsername: string;
  readonly currentPassword: string;
};

export type UserResponse = {
  readonly id: number;
  readonly username: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const updatePassword = async (
  data: UpdatePasswordRequest,
): Promise<{ success: boolean }> => {
  const { data: response } = await api.put<{ success: boolean }>(
    "users/password",
    data,
  );
  return response;
};

export const updateUsername = async (
  data: UpdateUsernameRequest,
): Promise<UserResponse> => {
  const { data: response } = await api.put<UserResponse>(
    "users/username",
    data,
  );
  return response;
};
