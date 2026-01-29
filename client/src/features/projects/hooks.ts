import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { projectsApi, columnsApi } from "./api";

export const projectKeys = {
  board: (projectId: number) => ["projectBoard", projectId] as const,
  detail: (projectId: number) => ["project", projectId] as const,
};

export function useProjectBoard(projectId: number) {
  return useQuery({
    queryKey: projectKeys.board(projectId),
    queryFn: () => projectsApi.board(projectId),
    staleTime: 10_000,
    enabled: !!projectId,
  });
}

export function useProject(projectId: number) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectsApi.get(projectId),
    staleTime: 30_000,
    enabled: !!projectId,
  });
}

export function useInvalidateProjectBoard() {
  const qc = useQueryClient();
  return (projectId: number) => qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
}

export function useCreateColumn(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => columnsApi.create(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
    },
  });
}

export function useUpdateColumn(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, data }: { columnId: number; data: { name?: string; color?: string } }) =>
      columnsApi.update(columnId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
    },
  });
}

export function useDeleteColumn(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnId: number) => columnsApi.delete(columnId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
    },
  });
}

export function useReorderColumns(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnIds: number[]) => columnsApi.reorder(projectId, columnIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.board(projectId) });
    },
  });
}
