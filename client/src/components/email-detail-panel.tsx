import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Reply, Send, ArrowLeft, Loader2, Trash2, Archive, Sparkles, RefreshCw, FileText, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, ListTodo, Forward, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { RichTextEditor } from "./rich-text-editor";

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

interface EmailSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "urgent";
}

interface EmailSignature {
  id: number;
  htmlContent: string;
  isDefault: boolean;
}

interface EmailDetailPanelProps {
  messageId: string;
  accountId?: number;
  onClose: () => void;
}

const toneLabels: Record<string, { label: string; color: string }> = {
  professional: { label: "Professional", color: "bg-blue-100 text-blue-700" },
  friendly: { label: "Friendly", color: "bg-green-100 text-green-700" },
  brief: { label: "Brief", color: "bg-purple-100 text-purple-700" },
};

const sentimentColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  positive: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle2 className="w-4 h-4" /> },
  neutral: { bg: "bg-gray-100", text: "text-gray-700", icon: <FileText className="w-4 h-4" /> },
  negative: { bg: "bg-red-100", text: "text-red-700", icon: <AlertCircle className="w-4 h-4" /> },
  urgent: { bg: "bg-orange-100", text: "text-orange-700", icon: <AlertCircle className="w-4 h-4" /> },
};

export function EmailDetailPanel({ messageId, accountId, onClose }: EmailDetailPanelProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySignatureAppended, setReplySignatureAppended] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardTo, setForwardTo] = useState("");
  const [forwardBody, setForwardBody] = useState("");
  const [forwardSignatureAppended, setForwardSignatureAppended] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const queryClient = useQueryClient();
  const replyPanelRef = useRef<HTMLDivElement>(null);
  const forwardPanelRef = useRef<HTMLDivElement>(null);
  
  const { data: defaultSignature } = useQuery<EmailSignature | null>({
    queryKey: ["/api/email-signatures/default"],
    queryFn: async () => {
      const res = await fetch("/api/email-signatures/default", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (isReplying && defaultSignature && !replySignatureAppended && !replyBody) {
      const signatureHtml = `<p><br></p><p>--</p>${defaultSignature.htmlContent}`;
      setReplyBody(signatureHtml);
      setReplySignatureAppended(true);
    }
  }, [isReplying, defaultSignature, replySignatureAppended, replyBody]);

  useEffect(() => {
    if (isReplying && replyPanelRef.current) {
      setTimeout(() => {
        replyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isReplying]);

  const { data: email, isLoading, isError } = useQuery<EmailDetail>({
    queryKey: ["gmail-message", messageId, accountId],
    queryFn: async () => {
      const url = accountId 
        ? `/api/gmail/messages/${messageId}?accountId=${accountId}` 
        : `/api/gmail/messages/${messageId}`;
      const res = await fetch(url, { credentials: "include" });
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

  const { data: emailSummary, isLoading: isSummaryLoading, refetch: refetchSummary, isFetching: isSummaryFetching, isError: isSummaryError } = useQuery<EmailSummary>({
    queryKey: ["email-summary", messageId],
    queryFn: async () => {
      const res = await fetch("/api/ai/email-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) throw new Error("Failed to summarize email");
      return res.json();
    },
    enabled: showSummary && !!email,
    staleTime: 10 * 60 * 1000,
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
      setReplySignatureAppended(false);
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
      toast.success("Reply sent successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send reply");
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
      toast.success("Email moved to trash");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete email");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/gmail/messages/${messageId}/archive`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to archive email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
      toast.success("Email archived");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive email");
    },
  });

  const forwardMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to forward email");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsForwarding(false);
      setForwardTo("");
      setForwardBody("");
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
      toast.success("Email forwarded successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to forward email");
    },
  });

  useEffect(() => {
    if (isForwarding && forwardPanelRef.current) {
      setTimeout(() => {
        forwardPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isForwarding]);

  useEffect(() => {
    if (isForwarding && email && !forwardBody) {
      const originalHeader = `\n\n---------- Forwarded message ---------\nFrom: ${email.from}\nDate: ${formatDate(email.date)}\nSubject: ${email.subject}\nTo: ${email.to}\n\n`;
      const plainBody = email.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      setForwardBody(originalHeader + plainBody);
    }
  }, [isForwarding, email, forwardBody]);

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

  function handleSendForward() {
    if (!email || !forwardTo.trim() || !forwardBody.trim()) return;
    
    const subject = email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`;
    
    forwardMutation.mutate({
      to: forwardTo.trim(),
      subject,
      body: forwardBody,
    });
  }

  function handleStartForward() {
    setIsForwarding(true);
    setIsReplying(false);
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
          <div className="flex gap-2" style={{ position: 'relative', zIndex: 100 }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                archiveMutation.mutate();
              }}
              disabled={archiveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              data-testid="button-archive-email"
            >
              {archiveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              Archive
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
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
                setShowSummary(!showSummary);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showSummary 
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              data-testid="button-summarize"
            >
              {isSummaryFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Summarize
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStartForward();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isForwarding 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              data-testid="button-forward"
            >
              <Forward className="w-4 h-4" />
              Forward
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsReplying(!isReplying);
                setIsForwarding(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
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
            
            {showSummary && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-900">AI Summary</span>
                    {emailSummary && (
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${sentimentColors[emailSummary.sentiment]?.bg} ${sentimentColors[emailSummary.sentiment]?.text}`}>
                        {sentimentColors[emailSummary.sentiment]?.icon}
                        {emailSummary.sentiment.charAt(0).toUpperCase() + emailSummary.sentiment.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {emailSummary && (
                      <button
                        onClick={() => {
                          const summaryText = [
                            emailSummary.summary,
                            emailSummary.keyPoints.length > 0 ? `\n\nKey Points:\n${emailSummary.keyPoints.map(p => `• ${p}`).join('\n')}` : '',
                            emailSummary.actionItems.length > 0 ? `\n\nAction Items:\n${emailSummary.actionItems.map(a => `→ ${a}`).join('\n')}` : ''
                          ].join('');
                          navigator.clipboard.writeText(summaryText);
                          setSummaryCopied(true);
                          toast.success("Summary copied to clipboard");
                          setTimeout(() => setSummaryCopied(false), 2000);
                        }}
                        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition-colors"
                        data-testid="button-copy-summary"
                      >
                        {summaryCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {summaryCopied ? 'Copied' : 'Copy'}
                      </button>
                    )}
                    <button
                      onClick={() => refetchSummary()}
                      disabled={isSummaryFetching}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition-colors"
                      data-testid="button-refresh-summary"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSummaryFetching ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>
                
                {isSummaryError ? (
                  <p className="text-sm text-red-600">Failed to generate summary. Please try again.</p>
                ) : isSummaryLoading || isSummaryFetching ? (
                  <div className="flex items-center gap-2 text-sm text-purple-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing email...
                  </div>
                ) : emailSummary ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">{emailSummary.summary}</p>
                    
                    {emailSummary.keyPoints.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-purple-800 mb-1">Key Points:</p>
                        <ul className="space-y-1">
                          {emailSummary.keyPoints.map((point, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-purple-500 mt-1">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {emailSummary.actionItems.length > 0 && (
                      <div className="pt-2 border-t border-purple-200">
                        <p className="text-xs font-medium text-orange-700 mb-1 flex items-center gap-1">
                          <ListTodo className="w-3 h-3" />
                          Action Items:
                        </p>
                        <ul className="space-y-1">
                          {emailSummary.actionItems.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-orange-500 mt-1">→</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            
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
            <div ref={replyPanelRef} className="p-6 border-t bg-gray-50">
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
              <RichTextEditor
                value={replyBody}
                onChange={setReplyBody}
                placeholder="Write your reply..."
                minHeight="160px"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsReplying(false);
                    setReplyBody("");
                    setReplySignatureAppended(false);
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

          {isForwarding && (
            <div ref={forwardPanelRef} className="p-6 border-t bg-blue-50">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Forward className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Forward Email</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-700 font-medium block mb-1">To:</label>
                <input
                  type="email"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  placeholder="Enter recipient email address..."
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  data-testid="input-forward-to"
                />
              </div>
              
              <div className="mb-2">
                <label className="text-sm text-gray-700 font-medium block mb-1">Message:</label>
              </div>
              <textarea
                value={forwardBody}
                onChange={(e) => setForwardBody(e.target.value)}
                placeholder="Add a message (optional)..."
                className="w-full h-40 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                data-testid="input-forward-body"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsForwarding(false);
                    setForwardTo("");
                    setForwardBody("");
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  data-testid="button-cancel-forward"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSendForward();
                  }}
                  disabled={!forwardTo.trim() || !forwardBody.trim() || forwardMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  data-testid="button-send-forward"
                >
                  {forwardMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Forward
                </button>
              </div>
              {forwardMutation.isError && (
                <p className="text-red-500 text-sm mt-2">{forwardMutation.error?.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
