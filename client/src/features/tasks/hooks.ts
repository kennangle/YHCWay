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
    mutationFn: ({ taskId, data }: { taskId: number; data: Partial<{ title: string; description: string; isCompleted: boolean; priority: string; dueDate: string; assigneeId: string }> }) =>
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
    }) => tasksApi.create({ projectId, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
    },
  });
}
