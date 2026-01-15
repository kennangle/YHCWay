import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "./api";
import { projectKeys } from "@/features/projects/hooks";
import type { ProjectBoardResponse } from "@/features/projects/types";

export const taskKeys = {
  detail: (taskId: number) => ["task", taskId] as const,
  projects: (taskId: number) => ["taskProjects", taskId] as const,
};

export function useTask(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? taskKeys.detail(taskId) : ["task", "none"],
    queryFn: () => tasksApi.get(taskId!),
    enabled: !!taskId,
    staleTime: 5_000,
  });
}

export function useTaskProjects(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? taskKeys.projects(taskId) : ["taskProjects", "none"],
    queryFn: () => tasksApi.getProjects(taskId!),
    enabled: !!taskId,
  });
}

export function useMovePlacement(projectId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      taskId: number;
      projectId: number;
      columnId: number | null;
      orderKey?: string | null;
      sortOrder?: number;
    }) => tasksApi.updatePlacement(input.taskId, {
      projectId: input.projectId,
      columnId: input.columnId,
      orderKey: input.orderKey ?? null,
      sortOrder: input.sortOrder,
    }),

    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: projectKeys.board(projectId) });
      const prev = qc.getQueryData<ProjectBoardResponse>(projectKeys.board(projectId));

      qc.setQueryData<ProjectBoardResponse>(projectKeys.board(projectId), (old) => {
        if (!old) return old;

        const next = structuredClone(old);
        const fromKey = Object.keys(next.tasksByColumn).find((k) =>
          next.tasksByColumn[k]?.some((t) => t.id === input.taskId)
        );

        let task: typeof next.tasksByColumn[string][number] | null = null;
        if (fromKey) {
          const idx = next.tasksByColumn[fromKey].findIndex((t) => t.id === input.taskId);
          task = next.tasksByColumn[fromKey][idx];
          next.tasksByColumn[fromKey].splice(idx, 1);
        }

        if (!task) return next;

        const toKey = input.columnId == null ? "null" : String(input.columnId);
        if (!next.tasksByColumn[toKey]) next.tasksByColumn[toKey] = [];

        task.placement = {
          ...task.placement,
          projectId: input.projectId,
          columnId: input.columnId,
          orderKey: input.orderKey ?? task.placement.orderKey,
          sortOrder: input.sortOrder ?? task.placement.sortOrder,
        };

        next.tasksByColumn[toKey].push(task);

        next.tasksByColumn[toKey].sort((a, b) => {
          const ak = a.placement.orderKey ?? "";
          const bk = b.placement.orderKey ?? "";
          if (ak && bk) return ak.localeCompare(bk);
          return (a.placement.sortOrder ?? 0) - (b.placement.sortOrder ?? 0);
        });

        return next;
      });

      return { prev };
    },

    onError: (_err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(projectKeys.board(projectId), ctx.prev);
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: Partial<{ 
      title: string; 
      description: string; 
      isCompleted: boolean; 
      priority: string; 
      dueDate: string; 
      assigneeId: string;
      isRecurring: boolean;
      recurrencePattern: string | null;
      recurrenceInterval: number;
      recurrenceEndDate: string | null;
    }> }) =>
      tasksApi.update(taskId, data),
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

export function useCreateTask(projectId: number) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      columnId: number;
      title: string;
      description?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
    }) => tasksApi.create({ projectId, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
    },
  });
}

export function useToggleTaskCompletion(projectId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, completed }: { taskId: number; completed: boolean }) =>
      tasksApi.toggleCompletion(taskId, completed),

    onMutate: async ({ taskId, completed }) => {
      await qc.cancelQueries({ queryKey: projectKeys.board(projectId) });
      const prev = qc.getQueryData<ProjectBoardResponse>(projectKeys.board(projectId));

      qc.setQueryData<ProjectBoardResponse>(projectKeys.board(projectId), (old) => {
        if (!old) return old;
        const next = structuredClone(old);
        for (const key of Object.keys(next.tasksByColumn)) {
          const tasks = next.tasksByColumn[key];
          const idx = tasks.findIndex((t) => t.id === taskId);
          if (idx !== -1) {
            tasks[idx].isCompleted = completed;
            break;
          }
        }
        return next;
      });

      return { prev };
    },

    onError: (_err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(projectKeys.board(projectId), ctx.prev);
    },

    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
      if (data.asanaError) {
        console.warn("Asana sync failed:", data.asanaError);
      }
    },
  });
}

export const collaboratorKeys = {
  list: (taskId: number) => ["taskCollaborators", taskId] as const,
};

export function useTaskCollaborators(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? collaboratorKeys.list(taskId) : ["taskCollaborators", "none"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/collaborators`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch collaborators");
      return res.json();
    },
    enabled: !!taskId,
  });
}

export function useAddTaskCollaborator() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, collaboratorId, role = "viewer" }: { 
      taskId: number; 
      collaboratorId: string; 
      role?: string;
    }) => {
      const res = await fetch(`/api/tasks/${taskId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: collaboratorId, role }),
      });
      if (!res.ok) throw new Error("Failed to add collaborator");
      return res.json();
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: collaboratorKeys.list(taskId) });
    },
  });
}

export function useRemoveTaskCollaborator() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: number; userId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/collaborators/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove collaborator");
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: collaboratorKeys.list(taskId) });
    },
  });
}

export function useArchiveTask(projectId?: number) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (taskId: number) => tasksApi.archive(taskId),
    onSuccess: (_, taskId) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      if (projectId) {
        qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
        qc.invalidateQueries({ queryKey: ["archivedTasks", projectId] });
      }
    },
  });
}

export function useUnarchiveTask(projectId?: number) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (taskId: number) => tasksApi.unarchive(taskId),
    onSuccess: (_, taskId) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      if (projectId) {
        qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
        qc.invalidateQueries({ queryKey: ["archivedTasks", projectId] });
      }
    },
  });
}

export function useArchivedTasks(projectId: number) {
  return useQuery({
    queryKey: ["archivedTasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/archived-tasks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch archived tasks");
      return res.json();
    },
    enabled: !!projectId,
  });
}
