import { useMutation } from "@tanstack/react-query";
import { updatePassword, UpdatePasswordRequest } from "@/api/users";

export const useUpdatePassword = () => {
  const mutation = useMutation({
    mutationFn: async (data: UpdatePasswordRequest) => {
      return await updatePassword(data);
    },
  });

  const handleUpdatePassword = async (data: UpdatePasswordRequest) => {
    return mutation.mutateAsync(data);
  };

  return {
    updatePassword: handleUpdatePassword,
    isUpdating: mutation.isPending,
    error: mutation.error?.message || null,
  };
};
