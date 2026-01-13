import { http } from "@/lib/http";
import type { Task, TaskProject } from "./types";

export const tasksApi = {
  get: (taskId: number) => http.get<Task>(`/api/tasks/${taskId}`),
  
  updatePlacement: (taskId: number, body: {
    projectId: number;
    columnId: number | null;
    sortOrder?: number;
    orderKey?: string | null;
  }) => http.patch<{ ok: true }>(`/api/tasks/${taskId}/placement`, body),

  update: (taskId: number, body: Partial<Task>) =>
    http.patch<Task>(`/api/tasks/${taskId}`, body),

  getProjects: (taskId: number) =>
    http.get<TaskProject[]>(`/api/tasks/${taskId}/projects`),

  create: (body: {
    projectId: number;
    columnId: number;
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    assigneeId?: string;
  }) => http.post<Task>("/api/tasks", body),

  toggleCompletion: (taskId: number, completed: boolean) =>
    http.patch<{ task: Task; asanaSynced: boolean; asanaError: string | null }>(
      `/api/tasks/${taskId}/complete`,
      { completed }
    ),
};
