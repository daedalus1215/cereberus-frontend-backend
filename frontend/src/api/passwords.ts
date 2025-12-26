import api from "./axios.interceptor";
import type { PasswordEntryResponse } from "@/pages/HomePage/components/PasswordTable/types";

export const fetchPasswords = async (): Promise<PasswordEntryResponse[]> => {
  const res = await api.get("passwords");
  return res.data;
};

export const fetchPassword = async (
  id: string,
): Promise<PasswordEntryResponse> => {
  const res = await api.get(`passwords/${id}`);
  return res.data;
};

export const deletePassword = async (id: string): Promise<void> => {
  await api.delete(`passwords/${id}`);
};
