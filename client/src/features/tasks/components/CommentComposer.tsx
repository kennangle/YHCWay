import { useState } from "react";
import { useCreateComment } from "@/features/stories/hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface CommentComposerProps {
  taskId: number;
}

export function CommentComposer({ taskId }: CommentComposerProps) {
  const [content, setContent] = useState("");
  const createComment = useCreateComment(taskId);

  const handleSubmit = () => {
    if (content.trim()) {
      createComment.mutate(content.trim());
      setContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment... (Cmd+Enter to send)"
        className="min-h-[80px] resize-none"
        data-testid="input-comment"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || createComment.isPending}
          data-testid="button-post-comment"
        >
          <Send className="w-4 h-4 mr-2" />
          Comment
        </Button>
      </div>
    </div>
  );
}
