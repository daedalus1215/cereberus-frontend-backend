import { useMutation } from "@tanstack/react-query";
import { updateUsername, UpdateUsernameRequest } from "@/api/users";
import { useAuth } from "@/auth/useAuth";

export const useUpdateUsername = () => {
  const { logout } = useAuth();

  const mutation = useMutation({
    mutationFn: async (data: UpdateUsernameRequest) => {
      return await updateUsername(data);
    },
    onSuccess: () => {
      logout();
    },
  });

  const handleUpdateUsername = async (data: UpdateUsernameRequest) => {
    return mutation.mutateAsync(data);
  };

  return {
    updateUsername: handleUpdateUsername,
    isUpdating: mutation.isPending,
    error: mutation.error?.message || null,
  };
};
