import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, CheckSquare, ExternalLink, Reply, Video, Check, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface RelatedEmail {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  score: number;
  reason: string;
}

interface RelatedTask {
  id: number;
  title: string;
  priority: string;
  dueDate?: string;
  score: number;
  reason: string;
}

interface EventInsightsPanelProps {
  eventId: string;
  eventTitle: string;
  joinUrl?: string;
  onClose?: () => void;
}

export function EventInsightsPanel({ eventId, eventTitle, joinUrl, onClose }: EventInsightsPanelProps) {
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<RelatedEmail | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data, isLoading } = useQuery<{ emails: RelatedEmail[]; tasks: RelatedTask[] }>({
    queryKey: ["/api/insights/event", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/insights/event/${eventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
    enabled: !!eventId,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed to complete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights/event", eventId] });
      toast.success("Task completed");
    },
    onError: () => toast.error("Failed to complete task"),
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          threadId,
          body: content,
          isReply: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => {
      setReplyingTo(null);
      setReplyContent("");
      toast.success("Reply sent");
    },
    onError: () => toast.error("Failed to send reply"),
  });

  const handleJoinMeeting = () => {
    if (joinUrl) {
      window.open(joinUrl, "_blank");
    }
  };

  const emails = data?.emails || [];
  const tasks = data?.tasks || [];
  const hasInsights = emails.length > 0 || tasks.length > 0;

  if (isLoading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    );
  }

  if (!hasInsights) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Related Items</h4>
        {joinUrl && (
          <Button 
            size="sm" 
            onClick={handleJoinMeeting}
            className="gap-1.5"
            data-testid="button-join-meeting"
          >
            <Video className="w-3.5 h-3.5" />
            Join Meeting
          </Button>
        )}
      </div>

      {emails.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Mail className="w-3.5 h-3.5" />
            Related Emails ({emails.length})
          </div>
          <div className="space-y-1.5">
            {emails.slice(0, 3).map((email) => (
              <div 
                key={email.id}
                className="p-2.5 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                data-testid={`insight-email-${email.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{email.from}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setReplyingTo(email)}
                      data-testid={`button-reply-${email.id}`}
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => window.open(`/email?thread=${email.id}`, "_blank")}
                      data-testid={`button-view-email-${email.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {email.snippet && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.snippet}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckSquare className="w-3.5 h-3.5" />
            Related Tasks ({tasks.length})
          </div>
          <div className="space-y-1.5">
            {tasks.slice(0, 3).map((task) => (
              <div 
                key={task.id}
                className="p-2.5 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                data-testid={`insight-task-${task.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.priority === 'high' && (
                        <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                      )}
                    </div>
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 gap-1"
                    onClick={() => completeTaskMutation.mutate(task.id)}
                    disabled={completeTaskMutation.isPending}
                    data-testid={`button-complete-task-${task.id}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Done
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Reply</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Replying to: </span>
              <span className="font-medium">{replyingTo?.subject}</span>
            </div>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              data-testid="input-reply-content"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyingTo(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => replyingTo && sendReplyMutation.mutate({ 
                  threadId: replyingTo.id, 
                  content: replyContent 
                })}
                disabled={!replyContent.trim() || sendReplyMutation.isPending}
                data-testid="button-send-reply"
              >
                Send Reply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface QuickActionsBarProps {
  emails?: Array<{ id: string; subject: string }>;
  tasks?: Array<{ id: number; title: string }>;
  joinUrl?: string;
  onReplyEmail?: (emailId: string) => void;
  onCompleteTask?: (taskId: number) => void;
}

export function QuickActionsBar({ emails = [], tasks = [], joinUrl, onReplyEmail, onCompleteTask }: QuickActionsBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {joinUrl && (
        <Button 
          size="sm" 
          variant="secondary"
          className="h-7 text-xs gap-1"
          onClick={() => window.open(joinUrl, "_blank")}
          data-testid="quick-action-join"
        >
          <Video className="w-3 h-3" />
          Join
        </Button>
      )}
      {emails.length > 0 && onReplyEmail && (
        <Button 
          size="sm" 
          variant="secondary"
          className="h-7 text-xs gap-1"
          onClick={() => onReplyEmail(emails[0].id)}
          data-testid="quick-action-reply"
        >
          <Reply className="w-3 h-3" />
          Reply ({emails.length})
        </Button>
      )}
      {tasks.length > 0 && onCompleteTask && (
        <Button 
          size="sm" 
          variant="secondary"
          className="h-7 text-xs gap-1"
          onClick={() => onCompleteTask(tasks[0].id)}
          data-testid="quick-action-complete"
        >
          <Check className="w-3 h-3" />
          Complete ({tasks.length})
        </Button>
      )}
    </div>
  );
}
