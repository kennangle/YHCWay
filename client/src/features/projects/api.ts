import { http } from "@/lib/http";
import type { ProjectBoardResponse, ProjectColumn } from "./types";

export const projectsApi = {
  board: (projectId: number) =>
    http.get<ProjectBoardResponse>(`/api/projects/${projectId}/board`),
  
  get: (projectId: number) =>
    http.get<{ id: number; name: string; description: string | null; color: string; tenantId?: string | null }>(`/api/projects/${projectId}`),
};

export const columnsApi = {
  create: (projectId: number, data: { name: string; color?: string }) =>
    http.post<ProjectColumn>(`/api/projects/${projectId}/columns`, data),
  
  update: (columnId: number, data: { name?: string; color?: string }) =>
    http.patch<ProjectColumn>(`/api/columns/${columnId}`, data),
  
  delete: (columnId: number) =>
    http.delete<void>(`/api/columns/${columnId}`),
  
  reorder: (projectId: number, columnIds: number[]) =>
    http.post<{ success: boolean }>(`/api/projects/${projectId}/columns/reorder`, { columnIds }),
};
