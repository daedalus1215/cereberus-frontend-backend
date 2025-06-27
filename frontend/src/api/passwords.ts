import api from './axios.interceptor';
import type { PasswordEntry } from '@/pages/HomePage/components/PasswordTable/types';

export const fetchPasswords = async (): Promise<PasswordEntry[]> => {
  const res = await api.get('passwords');
  return res.data;
};

export const fetchPassword = async (id: string): Promise<PasswordEntry> => {
  const res = await api.get(`passwords/${id}`);
  return res.data;
}; 