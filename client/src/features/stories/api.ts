import { http } from "@/lib/http";
import type { Story } from "./types";

export const storiesApi = {
  list: (taskId: number) => http.get<Story[]>(`/api/tasks/${taskId}/stories`),
  comment: (taskId: number, content: string) =>
    http.post<{ id: number }>(`/api/tasks/${taskId}/comments`, { content }),
};
