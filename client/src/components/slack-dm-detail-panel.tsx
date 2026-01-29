import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Send, Loader2, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SlackDmMessage {
  id: string;
  channelId: string;
  channelName: string;
  text: string;
  userName: string;
  timestamp: string;
  isDm?: boolean;
  threadTs?: string;
}

interface SlackDmDetailPanelProps {
  message: SlackDmMessage;
  onClose: () => void;
}

export function SlackDmDetailPanel({ message, onClose }: SlackDmDetailPanelProps) {
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: async (text: string) => {
      console.log("Sending Slack reply:", { channelId: message.channelId, message: text, threadTs: message.threadTs });
      const res = await fetch("/api/v2/slack/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channelId: message.channelId,
          message: text,
          threadTs: message.threadTs,
        }),
      });
      const data = await res.json();
      console.log("Slack reply response:", res.status, data);
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to send reply");
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Reply sent successfully");
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["slack-messages"] });
      queryClient.invalidateQueries({ queryKey: ["slack-dms"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send reply");
    },
  });

  const handleSendReply = () => {
    if (!replyText.trim()) {
      toast.error("Please enter a message");
      return;
    }
    replyMutation.mutate(replyText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSendReply();
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{message.channelName}</h3>
              <p className="text-sm text-muted-foreground">Direct Message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/80 transition-colors"
            data-testid="button-close-dm-panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{message.userName}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(message.timestamp)}</span>
                </div>
                <p className="text-foreground whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t p-4 bg-gray-50">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Reply to this conversation</label>
            <Textarea
              placeholder="Type your reply... (Cmd/Ctrl+Enter to send)"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none"
              data-testid="input-dm-reply"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} data-testid="button-cancel-dm-reply">
                Cancel
              </Button>
              <Button
                onClick={handleSendReply}
                disabled={replyMutation.isPending || !replyText.trim()}
                className="bg-pink-600 hover:bg-pink-700"
                data-testid="button-send-dm-reply"
              >
                {replyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Reply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
