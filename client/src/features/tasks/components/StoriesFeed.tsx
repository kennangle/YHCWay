import { useTaskStories } from "@/features/stories/hooks";
import { MessageSquare, Activity } from "lucide-react";
import type { Story } from "@/features/stories/types";

interface StoriesFeedProps {
  taskId: number;
}

function StoryItem({ story }: { story: Story }) {
  const isComment = story.storyType === "comment";
  const authorName = story.creator?.firstName || story.creator?.email?.split("@")[0] || "System";

  return (
    <div
      className={`p-3 rounded-lg ${isComment ? "bg-white border border-gray-100" : "bg-blue-50/50"}`}
      data-testid={`story-${story.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isComment ? "bg-gray-100" : "bg-blue-100"
        }`}>
          {isComment ? (
            <MessageSquare className="w-4 h-4 text-gray-500" />
          ) : (
            <Activity className="w-4 h-4 text-blue-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              {authorName}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(story.createdAt).toLocaleString()}
            </span>
            {!isComment && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                Activity
              </span>
            )}
            {story._optimistic && (
              <span className="text-[10px] text-gray-400 italic">Sending...</span>
            )}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{story.content}</p>
        </div>
      </div>
    </div>
  );
}

export function StoriesFeed({ taskId }: StoriesFeedProps) {
  const { data: stories = [], isLoading } = useTaskStories(taskId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
        <p className="text-xs">Add a comment to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stories.map((story) => (
        <StoryItem key={story.id} story={story} />
      ))}
    </div>
  );
}
