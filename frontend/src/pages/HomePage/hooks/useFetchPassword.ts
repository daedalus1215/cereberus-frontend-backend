import { useQuery } from "@tanstack/react-query";
import { fetchPassword } from "@/api/passwords";
import { PasswordEntryResponse } from "../components/PasswordTable/types";
import { useMemo, useState } from "react";

export const useFetchPassword = (objectToRevealId: string | null) => {
  const [revealedId, setRevealedId] = useState<string | null>(objectToRevealId);

  const queryKey = useMemo(() => ["password", revealedId], [revealedId]);


  const { data: revealedPassword, isLoading: isLoadingPassword } =
    useQuery<PasswordEntryResponse>({
      queryKey,
      queryFn: () => fetchPassword(revealedId!),
      enabled: !!revealedId,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: "always",
    });

  return { revealedPassword, isLoadingPassword, setRevealedId, revealedId };
};
