import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storiesApi } from "./api";
import type { Story } from "./types";

export const storyKeys = {
  list: (taskId: number) => ["taskStories", taskId] as const,
};

export function useTaskStories(taskId: number | null) {
  return useQuery({
    queryKey: taskId ? storyKeys.list(taskId) : ["taskStories", "none"],
    queryFn: () => storiesApi.list(taskId!),
    enabled: !!taskId,
    staleTime: 5_000,
  });
}

export function useCreateComment(taskId: number) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (content: string) => storiesApi.comment(taskId, content),
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: storyKeys.list(taskId) });
      const prev = qc.getQueryData<Story[]>(storyKeys.list(taskId));

      const optimistic: Story = {
        id: -Date.now(),
        taskId,
        storyType: "comment",
        content,
        activityType: null,
        metadata: null,
        createdBy: "me",
        createdAt: new Date().toISOString(),
        creator: { firstName: "You", lastName: null, email: "" },
        _optimistic: true,
      };

      qc.setQueryData<Story[]>(storyKeys.list(taskId), (old) => [...(old ?? []), optimistic]);

      return { prev };
    },
    onError: (_err, _content, ctx) => {
      if (ctx?.prev) qc.setQueryData(storyKeys.list(taskId), ctx.prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storyKeys.list(taskId) });
    },
  });
}
