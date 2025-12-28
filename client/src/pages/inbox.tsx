import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { Search, Mail, MessageCircle, Users, MessageSquare, PenSquare } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery } from "@tanstack/react-query";
import { SlackChannelConfig } from "@/components/slack-channel-config";
import { EmailDetailPanel } from "@/components/email-detail-panel";
import { ComposeEmailModal } from "@/components/compose-email-modal";
import { useState } from "react";

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isUnread: boolean;
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
};

type FilterType = 'all' | 'gmail' | 'slack' | 'dms';

export default function Inbox() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  
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

  const filteredMessages = unifiedMessages.filter(msg => {
    if (filter === 'all') return true;
    if (filter === 'gmail') return msg.type === 'gmail';
    if (filter === 'slack') return msg.type === 'slack';
    if (filter === 'dms') return msg.type === 'slack-dm';
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

  const isLoading = gmailLoading || slackLoading;

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <UnifiedSidebar />

      <main className="flex-1 ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="font-display font-bold text-3xl">Unified Inbox</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setIsComposing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
              data-testid="button-compose"
            >
              <PenSquare className="w-4 h-4" />
              Compose
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="pl-10 pr-4 py-2 rounded-full glass-panel border-0 w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-search"
              />
            </div>
          </div>
        </header>

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
          <div className="ml-auto">
            <SlackChannelConfig />
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">Loading messages...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {filter === 'all' ? 'No messages yet' : `No ${filter === 'gmail' ? 'emails' : filter === 'slack' ? 'channel messages' : 'direct messages'} found`}
            </div>
          ) : (
            filteredMessages.map((message) => {
              const borderColor = message.type === 'gmail' ? 'border-l-red-500' : message.type === 'slack-dm' ? 'border-l-pink-500' : 'border-l-purple-500';
              const bgColor = message.type === 'gmail' ? 'bg-red-100' : message.type === 'slack-dm' ? 'bg-pink-100' : 'bg-purple-100';
              const iconColor = message.type === 'gmail' ? 'text-red-600' : message.type === 'slack-dm' ? 'text-pink-600' : 'text-purple-600';
              
              const handleClick = (e: React.MouseEvent) => {
                if (message.type === 'gmail') {
                  e.preventDefault();
                  const gmailId = message.id.replace('gmail-', '');
                  setSelectedEmailId(gmailId);
                }
              };
              
              return (
                <a
                  key={message.id}
                  href={message.type === 'gmail' ? '#' : (message.link || '#')}
                  target={message.type !== 'gmail' && message.link ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  onClick={handleClick}
                  className={`glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors cursor-pointer block border-l-4 ${borderColor} ${message.isUnread ? 'bg-white/90' : ''}`}
                  data-testid={`message-${message.id}`}
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
                          {message.replyCount && message.replyCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {message.replyCount}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                      </div>
                      {message.subtitle && message.type === 'gmail' && (
                        <h4 className={`text-sm mb-1 ${message.isUnread ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                          {message.subtitle}
                        </h4>
                      )}
                      {message.userName && message.type !== 'gmail' && (
                        <p className="text-xs text-muted-foreground mb-1">{message.userName}</p>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">{message.preview}</p>
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>
        </div>
      </main>

      {selectedEmailId && (
        <EmailDetailPanel 
          messageId={selectedEmailId} 
          onClose={() => setSelectedEmailId(null)} 
        />
      )}

      {isComposing && (
        <ComposeEmailModal onClose={() => setIsComposing(false)} />
      )}
    </div>
  );
}
