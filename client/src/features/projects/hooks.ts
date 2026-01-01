import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "./api";

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
