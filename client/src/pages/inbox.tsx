import { Search, Mail, MessageCircle, Users, MessageSquare, PenSquare, Loader2, Share2, Check, Trash2, Archive, Send, RefreshCw, AlertTriangle, Settings, PanelLeftClose, PanelLeft } from "lucide-react";
import { GmailSidebar } from "@/components/gmail-sidebar";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SlackChannelConfig } from "@/components/slack-channel-config";
import { SlackDmConfig } from "@/components/slack-dm-config";
import { EmailDetailPanel } from "@/components/email-detail-panel";
import { ComposeEmailModal } from "@/components/compose-email-modal";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  accountId?: number;
  accountEmail?: string;
  accountLabel?: string | null;
}

interface SlackMessage {
  id: string;
  channelId: string;
  channelName: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: string;
  permalink?: string;
  threadTs?: string;
  replyCount?: number;
  isDm?: boolean;
}

type UnifiedMessage = {
  id: string;
  type: 'gmail' | 'slack' | 'slack-dm';
  title: string;
  subtitle: string;
  preview: string;
  timestamp: Date;
  isUnread?: boolean;
  link?: string;
  userName?: string;
  replyCount?: number;
  accountId?: number;
  accountEmail?: string;
  accountLabel?: string | null;
};

type FilterType = 'all' | 'gmail' | 'slack' | 'dms' | 'sent' | 'archived' | 'trash';

const ACCOUNT_COLORS = [
  { bg: 'bg-red-100', text: 'text-red-700' },
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
];

function getAccountColor(accountId: number | undefined): { bg: string; text: string } {
  if (!accountId) return ACCOUNT_COLORS[0];
  return ACCOUNT_COLORS[accountId % ACCOUNT_COLORS.length];
}

interface GmailAccount {
  id: number;
  email: string;
  label: string | null;
  isPrimary: boolean | null;
  needsReconnect?: boolean;
}

interface GmailStatus {
  connected: boolean;
  type?: 'custom' | 'connector';
  accounts: GmailAccount[];
  needsReconnect: boolean;
  message?: string | null;
}

export default function Inbox() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [sharingMessage, setSharingMessage] = useState<UnifiedMessage | null>(null);
  const [shareNote, setShareNote] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedGmailLabel, setSelectedGmailLabel] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const queryClient = useQueryClient();

  const { data: gmailAccounts = [] } = useQuery<GmailAccount[]>({
    queryKey: ["/api/gmail/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/accounts", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: gmailStatus } = useQuery<GmailStatus>({
    queryKey: ["/api/gmail/status"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/status", { credentials: "include" });
      if (!res.ok) return { connected: false, accounts: [], needsReconnect: false };
      return res.json();
    },
  });

  const shareItemMutation = useMutation({
    mutationFn: async (data: { itemType: "email" | "slack"; itemId: string; title: string; preview: string; note?: string }) => {
      const res = await fetch("/api/shared-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to share item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-items"] });
      toast.success("Shared with team!");
      setSharingMessage(null);
      setShareNote("");
    },
    onError: () => {
      toast.error("Failed to share");
    },
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/gmail/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete email");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
      toast.success("Email moved to trash");
    },
    onError: () => {
      toast.error("Failed to delete email");
    },
  });
  
  const { data: gmailMessages = [], isLoading: gmailLoading, isError: gmailError } = useQuery<GmailMessage[]>({
    queryKey: ["gmail-messages"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/messages", { credentials: "include" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Gmail fetch failed:", res.status, errorData);
        throw new Error(errorData.error || "Failed to load emails");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: slackMessages = [], isLoading: slackLoading } = useQuery<SlackMessage[]>({
    queryKey: ["slack-messages"],
    queryFn: async () => {
      const res = await fetch("/api/slack/messages/filtered", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const { data: archivedEmails = [], isLoading: archivedLoading } = useQuery<GmailMessage[]>({
    queryKey: ["gmail-archived"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/archived", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: filter === 'archived',
    retry: false,
  });

  const { data: sentEmails = [], isLoading: sentLoading } = useQuery<GmailMessage[]>({
    queryKey: ["gmail-sent"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/sent", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: filter === 'sent',
    retry: false,
  });

  const { data: trashedEmails = [], isLoading: trashLoading } = useQuery<GmailMessage[]>({
    queryKey: ["gmail-trash"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/trash", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: filter === 'trash',
    retry: false,
  });

  const { data: labelEmails = [], isLoading: labelLoading } = useQuery<GmailMessage[]>({
    queryKey: ["gmail-label-messages", selectedGmailLabel],
    queryFn: async () => {
      const res = await fetch(`/api/gmail/labels/${selectedGmailLabel}/messages`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: filter === 'gmail' && selectedGmailLabel !== null,
    retry: false,
  });

  const unifiedMessages: UnifiedMessage[] = [
    ...gmailMessages.map((email): UnifiedMessage => ({
      id: `gmail-${email.id}`,
      type: 'gmail',
      title: extractSenderName(email.from),
      subtitle: email.subject,
      preview: email.snippet,
      timestamp: new Date(email.date),
      isUnread: email.isUnread,
      link: `https://mail.google.com/mail/u/0/#inbox/${email.threadId}`,
      accountId: email.accountId,
      accountEmail: email.accountEmail,
      accountLabel: email.accountLabel,
    })),
    ...slackMessages.map((msg): UnifiedMessage => ({
      id: `slack-${msg.id}`,
      type: msg.isDm ? 'slack-dm' : 'slack',
      title: msg.isDm ? msg.channelName : `#${msg.channelName}`,
      subtitle: msg.userName || '',
      preview: msg.text,
      timestamp: new Date(msg.timestamp),
      link: msg.permalink,
      userName: msg.userName,
      replyCount: msg.replyCount,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const archivedMessages: UnifiedMessage[] = archivedEmails.map((email): UnifiedMessage => ({
    id: `gmail-archived-${email.id}`,
    type: 'gmail',
    title: extractSenderName(email.from),
    subtitle: email.subject,
    preview: email.snippet,
    timestamp: new Date(email.date),
    isUnread: email.isUnread,
    link: `https://mail.google.com/mail/u/0/#all/${email.threadId}`,
  })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const sentMessages: UnifiedMessage[] = sentEmails.map((email): UnifiedMessage => ({
    id: `gmail-sent-${email.id}`,
    type: 'gmail',
    title: email.from,
    subtitle: email.subject,
    preview: email.snippet,
    timestamp: new Date(email.date),
    isUnread: false,
    link: `https://mail.google.com/mail/u/0/#sent/${email.threadId}`,
  })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const trashMessages: UnifiedMessage[] = trashedEmails.map((email): UnifiedMessage => ({
    id: `gmail-trash-${email.id}`,
    type: 'gmail',
    title: extractSenderName(email.from),
    subtitle: email.subject,
    preview: email.snippet,
    timestamp: new Date(email.date),
    isUnread: email.isUnread,
    link: `https://mail.google.com/mail/u/0/#trash/${email.threadId}`,
  })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const labelMessages: UnifiedMessage[] = labelEmails.map((email): UnifiedMessage => ({
    id: `gmail-label-${email.id}`,
    type: 'gmail',
    title: extractSenderName(email.from),
    subtitle: email.subject,
    preview: email.snippet,
    timestamp: new Date(email.date),
    isUnread: email.isUnread,
    link: `https://mail.google.com/mail/u/0/#inbox/${email.threadId}`,
    accountId: email.accountId,
    accountEmail: email.accountEmail,
    accountLabel: email.accountLabel,
  })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getMessagesForFilter = () => {
    if (filter === 'archived') return archivedMessages;
    if (filter === 'sent') return sentMessages;
    if (filter === 'trash') return trashMessages;
    if (filter === 'gmail' && selectedGmailLabel !== null) return labelMessages;
    return unifiedMessages;
  };

  const filteredMessages = getMessagesForFilter().filter(msg => {
    // First filter by type (skip for archived/sent/trash/label-filtered since we already have filtered lists)
    if (filter !== 'archived' && filter !== 'sent' && filter !== 'trash' && !(filter === 'gmail' && selectedGmailLabel !== null)) {
      if (filter === 'gmail' && msg.type !== 'gmail') return false;
      if (filter === 'slack' && msg.type !== 'slack') return false;
      if (filter === 'dms' && msg.type !== 'slack-dm') return false;
    }
    
    // Filter by selected account
    if (selectedAccountId !== null && msg.type === 'gmail' && msg.accountId !== selectedAccountId) {
      return false;
    }
    
    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        msg.title.toLowerCase().includes(query) ||
        msg.subtitle.toLowerCase().includes(query) ||
        msg.preview.toLowerCase().includes(query) ||
        (msg.userName?.toLowerCase().includes(query) ?? false)
      );
    }
    return true;
  });

  function extractSenderName(from: string) {
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim().replace(/"/g, '') : from;
  }

  function formatTime(date: Date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  const isLoading = filter === 'archived' ? archivedLoading : 
    filter === 'sent' ? sentLoading : 
    filter === 'trash' ? trashLoading : 
    (filter === 'gmail' && selectedGmailLabel !== null) ? labelLoading :
    (gmailLoading || slackLoading);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
        <div className="flex-1 p-8 relative z-10">
        <header className="flex justify-between items-center mb-8">
          <h1 className="font-display font-bold text-3xl">Mailbox</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setIsComposing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
              data-testid="button-compose"
            >
              <PenSquare className="w-4 h-4" />
              Compose
            </button>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
                queryClient.invalidateQueries({ queryKey: ["gmail-sent"] });
                queryClient.invalidateQueries({ queryKey: ["gmail-archived"] });
                queryClient.invalidateQueries({ queryKey: ["gmail-trash"] });
                queryClient.invalidateQueries({ queryKey: ["slack-messages"] });
                queryClient.invalidateQueries({ queryKey: ["slack-dms"] });
                toast.success("Refreshing messages...");
              }}
              className="flex items-center gap-2 px-4 py-2 glass-panel rounded-full hover:bg-white/80 transition-colors"
              data-testid="button-refresh"
              title="Refresh messages"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {filter === 'trash' && (
              <button
                onClick={async () => {
                  if (!confirm("Are you sure you want to permanently delete all messages in Trash? This cannot be undone.")) {
                    return;
                  }
                  try {
                    const res = await fetch("/api/gmail/trash", {
                      method: "DELETE",
                      credentials: "include",
                    });
                    if (!res.ok) {
                      const error = await res.json();
                      throw new Error(error.error || "Failed to empty trash");
                    }
                    const result = await res.json();
                    queryClient.invalidateQueries({ queryKey: ["gmail-trash"] });
                    toast.success(`Deleted ${result.deletedCount} messages from trash`);
                  } catch (error: any) {
                    toast.error(error.message || "Failed to empty trash");
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                data-testid="button-empty-trash"
                title="Empty Trash"
              >
                <Trash2 className="w-4 h-4" />
                Empty Trash
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search messages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-full glass-panel border-0 w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-search"
              />
            </div>
          </div>
        </header>

        {gmailStatus?.needsReconnect && (
          <div 
            className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3"
            data-testid="alert-gmail-reconnect"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-800">
              Some Gmail accounts need to be reconnected to continue syncing.
            </span>
            <a 
              href="/settings" 
              className="ml-auto flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900"
              data-testid="link-reconnect-gmail"
            >
              <Settings className="w-4 h-4" />
              Go to Settings
            </a>
          </div>
        )}

        <div className="flex gap-2 mb-6 items-center">
          <button 
            className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'all' ? 'bg-white shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`} 
            onClick={() => setFilter('all')}
            data-testid="button-filter-all"
          >
            All
          </button>
          <button 
            className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'gmail' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
            onClick={() => setFilter('gmail')}
            data-testid="button-filter-gmail"
          >
            <Mail className="w-4 h-4 inline mr-2" />Gmail
          </button>
          <button 
            className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'slack' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
            onClick={() => setFilter('slack')}
            data-testid="button-filter-slack"
          >
            <MessageCircle className="w-4 h-4 inline mr-2" />Channels
          </button>
          <button 
            className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'dms' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
            onClick={() => setFilter('dms')}
            data-testid="button-filter-dms"
          >
            <Users className="w-4 h-4 inline mr-2" />DMs
          </button>
          <button 
            className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'sent' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
            onClick={() => setFilter('sent')}
            data-testid="button-filter-sent"
          >
            <Send className="w-4 h-4 inline mr-2" />Sent
          </button>
          <button 
            className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'archived' ? 'bg-gray-200 text-gray-700 shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
            onClick={() => setFilter('archived')}
            data-testid="button-filter-archived"
          >
            <Archive className="w-4 h-4 inline mr-2" />Archived
          </button>
          <button 
            className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'trash' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
            onClick={() => setFilter('trash')}
            data-testid="button-filter-trash"
          >
            <Trash2 className="w-4 h-4 inline mr-2" />Trash
          </button>
          
          {gmailAccounts.length > 1 && (
            <>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <select
                value={selectedAccountId ?? ''}
                onChange={(e) => setSelectedAccountId(e.target.value === '' ? null : Number(e.target.value))}
                className="px-3 py-2 rounded-full font-medium bg-white border border-gray-200 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                data-testid="select-account-filter"
              >
                <option value="">All Accounts</option>
                {gmailAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label || account.email.split('@')[0]} ({account.email})
                  </option>
                ))}
              </select>
            </>
          )}
          
          <div className="ml-auto flex items-center gap-2">
            <SlackDmConfig />
            <SlackChannelConfig />
          </div>
        </div>

        <div className={`flex gap-4 ${filter === 'gmail' ? '' : ''}`}>
          {filter === 'gmail' && (
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-white/60 transition-colors text-muted-foreground"
                  data-testid="button-toggle-gmail-sidebar"
                  title={sidebarOpen ? "Hide folders" : "Show folders"}
                >
                  {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </button>
              </div>
              {sidebarOpen && (
                <div className="glass-panel rounded-xl overflow-hidden">
                  <GmailSidebar 
                    selectedLabel={selectedGmailLabel}
                    selectedFolder={filter === "gmail" ? "inbox" : filter === "sent" ? "sent" : filter === "trash" ? "trash" : null}
                    onSelectLabel={(labelId) => {
                      setSelectedGmailLabel(labelId);
                      if (labelId) {
                        queryClient.invalidateQueries({ queryKey: ["gmail-label-messages", labelId] });
                      }
                    }}
                    onSelectFolder={(folder) => {
                      setSelectedGmailLabel(null);
                      if (folder === "inbox") {
                        setFilter("gmail");
                      } else if (folder) {
                        setFilter(folder);
                      }
                    }}
                    accountId={selectedAccountId}
                  />
                </div>
              )}
            </div>
          )}
          
          <div className="flex-1 space-y-2">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">Loading messages...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {filter === 'all' ? 'No messages yet' : filter === 'archived' ? 'No archived emails' : filter === 'sent' ? 'No sent emails' : filter === 'trash' ? 'No trashed emails' : selectedGmailLabel ? 'No emails in this folder' : `No ${filter === 'gmail' ? 'emails' : filter === 'slack' ? 'channel messages' : 'direct messages'} found`}
            </div>
          ) : (
            filteredMessages.map((message) => {
              const borderColor = message.type === 'gmail' ? 'border-l-red-500' : message.type === 'slack-dm' ? 'border-l-pink-500' : 'border-l-purple-500';
              const bgColor = message.type === 'gmail' ? 'bg-red-100' : message.type === 'slack-dm' ? 'bg-pink-100' : 'bg-purple-100';
              const iconColor = message.type === 'gmail' ? 'text-red-600' : message.type === 'slack-dm' ? 'text-pink-600' : 'text-purple-600';
              
              const handleClick = (e: React.MouseEvent) => {
                if (message.type === 'gmail') {
                  e.preventDefault();
                  const gmailId = message.id.replace(/^gmail-(archived-|sent-|trash-)?/, '');
                  setSelectedEmailId(gmailId);
                }
              };

              const handleShare = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setSharingMessage(message);
              };

              const handleDelete = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (message.type === 'gmail') {
                  const gmailId = message.id.replace(/^gmail-(archived-|sent-|trash-)?/, '');
                  deleteEmailMutation.mutate(gmailId);
                }
              };
              
              return (
                <div
                  key={message.id}
                  className={`glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors cursor-pointer border-l-4 ${borderColor} ${message.isUnread ? 'bg-white/90' : ''}`}
                  data-testid={`message-${message.id}`}
                  onClick={handleClick}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                      {message.type === 'gmail' ? (
                        <Mail className={`w-5 h-5 ${iconColor}`} />
                      ) : message.type === 'slack-dm' ? (
                        <Users className={`w-5 h-5 ${iconColor}`} />
                      ) : (
                        <MessageCircle className={`w-5 h-5 ${iconColor}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${message.isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                            {message.title}
                          </span>
                          {message.type === 'slack-dm' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium">DM</span>
                          )}
                          {message.type === 'gmail' && message.accountLabel && (
                            <span 
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getAccountColor(message.accountId).bg} ${getAccountColor(message.accountId).text}`} 
                              title={message.accountEmail || ''}
                            >
                              {message.accountLabel}
                            </span>
                          )}
                          {message.replyCount && message.replyCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {message.replyCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                          <button
                            onClick={handleShare}
                            className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors text-muted-foreground hover:text-blue-600"
                            title="Share with team"
                            data-testid={`button-share-${message.id}`}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          {message.type === 'gmail' && (
                            <button
                              onClick={handleDelete}
                              className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-muted-foreground hover:text-red-600"
                              title="Delete email"
                              disabled={deleteEmailMutation.isPending}
                              data-testid={`button-delete-${message.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {message.subtitle && message.type === 'gmail' && (
                        <h4 className={`text-sm mb-1 ${message.isUnread ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                          {message.subtitle}
                        </h4>
                      )}
                      {message.userName && message.type !== 'gmail' && (
                        <p className="text-xs text-muted-foreground mb-1">{message.userName}</p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2 whitespace-normal break-words">{message.preview}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>

      {selectedEmailId && (
        <EmailDetailPanel 
          messageId={selectedEmailId} 
          onClose={() => setSelectedEmailId(null)} 
        />
      )}

      {isComposing && (
        <ComposeEmailModal onClose={() => setIsComposing(false)} />
      )}

      <Dialog open={!!sharingMessage} onOpenChange={(open) => !open && setSharingMessage(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Share with Team
            </DialogTitle>
            <DialogDescription>
              Share this {sharingMessage?.type === 'gmail' ? 'email' : 'message'} with your team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm">{sharingMessage?.title}</p>
              {sharingMessage?.subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{sharingMessage.subtitle}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{sharingMessage?.preview}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Add a note (optional)</label>
              <Textarea
                placeholder="Why are you sharing this? Any context for your team..."
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                className="min-h-[80px]"
                data-testid="input-share-note"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSharingMessage(null)} data-testid="button-cancel-share">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!sharingMessage) return;
                  const itemId = sharingMessage.id.replace('gmail-', '').replace('slack-', '');
                  shareItemMutation.mutate({
                    itemType: sharingMessage.type === 'gmail' ? 'email' : 'slack',
                    itemId,
                    title: sharingMessage.subtitle || sharingMessage.title,
                    preview: sharingMessage.preview,
                    note: shareNote || undefined,
                  });
                }}
                disabled={shareItemMutation.isPending}
                data-testid="button-confirm-share"
              >
                {shareItemMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
