import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Reply, Send, ArrowLeft, Loader2, Trash2, Sparkles, RefreshCw } from "lucide-react";
import DOMPurify from "dompurify";

interface EmailDetail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  replyTo?: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  body: string;
}

interface SuggestedReply {
  tone: "professional" | "friendly" | "brief";
  text: string;
}

interface EmailDetailPanelProps {
  messageId: string;
  onClose: () => void;
}

const toneLabels: Record<string, { label: string; color: string }> = {
  professional: { label: "Professional", color: "bg-blue-100 text-blue-700" },
  friendly: { label: "Friendly", color: "bg-green-100 text-green-700" },
  brief: { label: "Brief", color: "bg-purple-100 text-purple-700" },
};

export function EmailDetailPanel({ messageId, onClose }: EmailDetailPanelProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const queryClient = useQueryClient();

  const { data: email, isLoading, isError } = useQuery<EmailDetail>({
    queryKey: ["gmail-message", messageId],
    queryFn: async () => {
      const res = await fetch(`/api/gmail/messages/${messageId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load email");
      return res.json();
    },
  });

  const { data: suggestions, isLoading: isSuggestionsLoading, refetch: refetchSuggestions, isFetching: isSuggestionsFetching, isError: isSuggestionsError } = useQuery<{ suggestions: SuggestedReply[] }>({
    queryKey: ["email-suggestions", messageId],
    queryFn: async () => {
      const res = await fetch("/api/ai/email-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) throw new Error("Failed to generate suggestions");
      return res.json();
    },
    enabled: isReplying && !!email,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string; threadId?: string }) => {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsReplying(false);
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/gmail/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
      onClose();
    },
  });

  function extractEmail(fromHeader: string): string {
    const match = fromHeader.match(/<([^>]+)>/);
    return match ? match[1] : fromHeader;
  }

  function extractName(fromHeader: string): string {
    const match = fromHeader.match(/^([^<]+)/);
    return match ? match[1].trim().replace(/"/g, '') : fromHeader;
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  }

  function handleSendReply() {
    if (!email || !replyBody.trim()) return;
    
    const replyTo = email.replyTo || extractEmail(email.from);
    const subject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
    
    sendMutation.mutate({
      to: replyTo,
      subject,
      body: replyBody,
      threadId: email.threadId,
    });
  }

  function handleUseSuggestion(text: string) {
    setReplyBody(text);
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex items-center justify-center p-12" onClick={e => e.stopPropagation()}>
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError || !email) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-8" onClick={e => e.stopPropagation()}>
          <p className="text-red-500">Failed to load email</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="button-close-email"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              data-testid="button-delete-email"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsReplying(!isReplying);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              data-testid="button-reply"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4" data-testid="text-email-subject">{email.subject}</h2>
            
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold">
                  {extractName(email.from).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium" data-testid="text-email-from">{extractName(email.from)}</p>
                    <p className="text-sm text-muted-foreground">{extractEmail(email.from)}</p>
                  </div>
                  <span className="text-sm text-muted-foreground" data-testid="text-email-date">{formatDate(email.date)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  To: {email.to}
                  {email.cc && <><br />Cc: {email.cc}</>}
                </p>
              </div>
            </div>

            <div 
              className="prose prose-sm max-w-none email-body"
              data-testid="text-email-body"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body) }}
            />
          </div>

          {isReplying && (
            <div className="p-6 border-t bg-gray-50">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">AI Suggested Replies</span>
                  </div>
                  <button
                    onClick={() => refetchSuggestions()}
                    disabled={isSuggestionsFetching}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    data-testid="button-refresh-suggestions"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSuggestionsFetching ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
                
                {isSuggestionsError ? (
                  <p className="text-sm text-muted-foreground py-2">
                    AI suggestions unavailable. You can still write your reply below.
                  </p>
                ) : isSuggestionsLoading || isSuggestionsFetching ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating suggestions...
                  </div>
                ) : suggestions?.suggestions && suggestions.suggestions.length > 0 ? (
                  <div className="space-y-2">
                    {suggestions.suggestions.map((suggestion, index) => {
                      const toneInfo = toneLabels[suggestion.tone] || toneLabels.professional;
                      return (
                        <button
                          key={index}
                          onClick={() => handleUseSuggestion(suggestion.text)}
                          className="w-full text-left p-3 bg-white border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                          data-testid={`button-apply-suggestion-${index}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${toneInfo.color}`}>
                              {toneInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{suggestion.text}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No suggestions available. Click Regenerate to try again.
                  </p>
                )}
              </div>

              <div className="mb-2">
                <span className="text-sm text-muted-foreground">
                  Replying to: {extractEmail(email.from)}
                </span>
              </div>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write your reply..."
                className="w-full h-40 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-reply-body"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsReplying(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  data-testid="button-cancel-reply"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSendReply();
                  }}
                  disabled={!replyBody.trim() || sendMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  data-testid="button-send-reply"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
              {sendMutation.isError && (
                <p className="text-red-500 text-sm mt-2">{sendMutation.error?.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
