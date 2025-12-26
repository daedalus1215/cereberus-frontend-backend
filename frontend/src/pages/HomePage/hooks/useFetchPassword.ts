import { useQuery } from "@tanstack/react-query";
import { fetchPassword } from "@/api/passwords";
import { PasswordEntryResponse } from "../components/PasswordTable/types";
import { useState } from "react";

export const useFetchPassword = (objectToRevealId: string | null) => {
  const [revealedId, setRevealedId] = useState<string | null>(objectToRevealId);

  const { data: revealedPassword, isLoading: isLoadingPassword } =
    useQuery<PasswordEntryResponse>({
      queryKey: ["password", revealedId],
      queryFn: () => fetchPassword(revealedId!),
      enabled: !!revealedId,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: "always",
    });

  return { revealedPassword, isLoadingPassword, setRevealedId, revealedId };
};
