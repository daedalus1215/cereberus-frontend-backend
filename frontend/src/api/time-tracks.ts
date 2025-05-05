import api from "./axios.interceptor";

export const getTimeTracksTotalByNoteId = async (noteId: number): Promise<number> => {
  const response = await api.get(`/time-tracks/note/${noteId}/total`);
  return response.data;
}; 