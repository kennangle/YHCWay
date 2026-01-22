import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Send, Loader2 } from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

interface EmailSignature {
  id: number;
  htmlContent: string;
  isDefault: boolean;
  gmailAccountId?: number | null;
}

interface GmailAccount {
  id: number;
  email: string;
  label: string | null;
  isPrimary: boolean | null;
}

const ACCOUNT_COLORS = [
  { bg: 'bg-red-500', border: 'border-red-500' },
  { bg: 'bg-blue-500', border: 'border-blue-500' },
  { bg: 'bg-green-500', border: 'border-green-500' },
  { bg: 'bg-purple-500', border: 'border-purple-500' },
  { bg: 'bg-orange-500', border: 'border-orange-500' },
  { bg: 'bg-teal-500', border: 'border-teal-500' },
  { bg: 'bg-pink-500', border: 'border-pink-500' },
  { bg: 'bg-indigo-500', border: 'border-indigo-500' },
  { bg: 'bg-yellow-500', border: 'border-yellow-500' },
  { bg: 'bg-cyan-500', border: 'border-cyan-500' },
];

function getAccountColor(accountId: number): { bg: string; border: string } {
  return ACCOUNT_COLORS[accountId % ACCOUNT_COLORS.length];
}

interface ComposeEmailModalProps {
  onClose: () => void;
}

export function ComposeEmailModal({ onClose }: ComposeEmailModalProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [signatureAppended, setSignatureAppended] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: gmailAccounts = [] } = useQuery<GmailAccount[]>({
    queryKey: ["/api/gmail/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/accounts", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    if (gmailAccounts.length > 0 && selectedAccountId === null) {
      const primary = gmailAccounts.find(a => a.isPrimary);
      setSelectedAccountId(primary?.id || gmailAccounts[0].id);
    }
  }, [gmailAccounts, selectedAccountId]);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: accountSignature, refetch: refetchSignature } = useQuery<EmailSignature | null>({
    queryKey: ["/api/email-signatures/account", selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) {
        const res = await fetch("/api/email-signatures/default", { credentials: "include" });
        if (!res.ok) return null;
        return res.json();
      }
      const res = await fetch(`/api/email-signatures/account/${selectedAccountId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: true,
  });

  useEffect(() => {
    if (accountSignature && !signatureAppended && !body) {
      // Insert signature directly without extra lines or separator
      const signatureHtml = `<br>${accountSignature.htmlContent}`;
      setBody(signatureHtml);
      setSignatureAppended(true);
    }
  }, [accountSignature, signatureAppended, body]);

  // Update signature when account changes
  useEffect(() => {
    if (selectedAccountId !== null) {
      refetchSignature();
    }
  }, [selectedAccountId, refetchSignature]);

  const filteredUsers = users.filter(user => {
    if (!to.trim()) return true; // Show all users when empty
    const searchTerm = to.toLowerCase();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchTerm) ||
      fullName.includes(searchTerm) ||
      user.firstName?.toLowerCase().includes(searchTerm) ||
      user.lastName?.toLowerCase().includes(searchTerm)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [to]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredUsers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
    } else if (e.key === "Enter" && filteredUsers[selectedIndex]) {
      e.preventDefault();
      selectUser(filteredUsers[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const selectUser = (user: User) => {
    setTo(user.email || "");
    setShowSuggestions(false);
  };

  const sendMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string; accountId?: number }) => {
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
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
      onClose();
    },
  });

  function handleSend() {
    const bodyText = body.replace(/<[^>]*>/g, '').trim();
    if (!to.trim() || !subject.trim() || !bodyText) return;
    sendMutation.mutate({ to, subject, body, accountId: selectedAccountId || undefined });
  }

  const hasBodyContent = body.replace(/<[^>]*>/g, '').trim().length > 0;

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-foreground">New Message</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            data-testid="button-close-compose"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {gmailAccounts.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
              <div className="flex flex-wrap gap-2">
                {gmailAccounts.map((account) => {
                  const color = getAccountColor(account.id);
                  const isSelected = selectedAccountId === account.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedAccountId(account.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        isSelected 
                          ? `${color.border} bg-gray-50 dark:bg-slate-700` 
                          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                      data-testid={`select-account-${account.id}`}
                    >
                      <span className={`w-3 h-3 rounded-full ${color.bg}`} />
                      <span className="text-sm text-foreground">
                        {account.label || account.email.split('@')[0]}
                      </span>
                      {account.isPrimary && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-gray-200 dark:bg-slate-600 text-muted-foreground">Primary</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
            <input
              ref={inputRef}
              type="email"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="recipient@example.com"
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              data-testid="input-compose-to"
            />
            {showSuggestions && (
              <div 
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto"
              >
                {filteredUsers.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs text-muted-foreground border-b border-gray-100 dark:border-slate-700">
                      Team Members
                    </div>
                    {filteredUsers.map((user, index) => (
                      <button
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                          index === selectedIndex ? 'bg-gray-100 dark:bg-slate-700' : ''
                        }`}
                        data-testid={`suggestion-user-${user.id}`}
                      >
                        {user.profileImageUrl ? (
                          <img 
                            src={user.profileImageUrl} 
                            alt="" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                            {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">
                            {getUserDisplayName(user)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                <div className="border-t border-gray-100 dark:border-slate-700">
                  <div className="px-4 py-2 text-xs text-muted-foreground">
                    Other (External Email)
                  </div>
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    Type any email address above and it will be used as the recipient
                  </div>
                  {to.trim() && to.includes('@') && !filteredUsers.some(u => u.email === to) && (
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors bg-blue-50 dark:bg-blue-900/20"
                      data-testid="button-use-external-email"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-medium">
                        @
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          Send to external email
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                          {to}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              data-testid="input-compose-subject"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Write your message..."
              minHeight="180px"
            />
          </div>
        </div>

        <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          {sendMutation.isError && (
            <p className="text-red-500 text-sm">{sendMutation.error?.message}</p>
          )}
          <div className="flex-1" />
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              data-testid="button-cancel-compose"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!to.trim() || !subject.trim() || !hasBodyContent || sendMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-send-compose"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
