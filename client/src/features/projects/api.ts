import { http } from "@/lib/http";
import type { ProjectBoardResponse } from "./types";

export const projectsApi = {
  board: (projectId: number) =>
    http.get<ProjectBoardResponse>(`/api/projects/${projectId}/board`),
  
  get: (projectId: number) =>
    http.get<{ id: number; name: string; description: string | null; color: string; tenantId?: string | null }>(`/api/projects/${projectId}`),
};
