import api from "./axios.interceptor";

export type TagResponse = {
  id: number;
  name: string;
};

export const fetchTags = async (): Promise<TagResponse[]> => {
  const res = await api.get("tags");
  return res.data;
};

