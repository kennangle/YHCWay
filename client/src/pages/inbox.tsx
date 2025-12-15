import { UnifiedSidebar } from "@/components/unified-sidebar";
import { Search, Mail, MessageCircle } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery } from "@tanstack/react-query";

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
}

type UnifiedMessage = {
  id: string;
  type: 'gmail' | 'slack';
  title: string;
  subtitle: string;
  preview: string;
  timestamp: Date;
  isUnread?: boolean;
  link?: string;
};

export default function Inbox() {
  const { data: gmailMessages = [], isLoading: gmailLoading } = useQuery<GmailMessage[]>({
    queryKey: ["gmail-messages"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/messages", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const { data: slackMessages = [], isLoading: slackLoading } = useQuery<SlackMessage[]>({
    queryKey: ["slack-messages"],
    queryFn: async () => {
      const res = await fetch("/api/slack/messages", { credentials: "include" });
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
    })),
    ...slackMessages.map((msg): UnifiedMessage => ({
      id: `slack-${msg.id}`,
      type: 'slack',
      title: `#${msg.channelName}`,
      subtitle: '',
      preview: msg.text,
      timestamp: new Date(msg.timestamp),
      link: msg.permalink,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

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

      <main className="flex-1 ml-64 p-8 relative z-10">
        <header className="flex justify-between items-center mb-8">
          <h1 className="font-display font-bold text-3xl">Unified Inbox</h1>
          <div className="flex gap-4">
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

        <div className="flex gap-2 mb-6">
          <button className="px-4 py-2 rounded-full bg-white shadow-sm font-medium" data-testid="button-filter-all">All</button>
          <button className="px-4 py-2 rounded-full text-muted-foreground hover:bg-white/50" data-testid="button-filter-gmail">
            <Mail className="w-4 h-4 inline mr-2" />Gmail
          </button>
          <button className="px-4 py-2 rounded-full text-muted-foreground hover:bg-white/50" data-testid="button-filter-slack">
            <MessageCircle className="w-4 h-4 inline mr-2" />Slack
          </button>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">Loading messages...</div>
          ) : unifiedMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No messages yet</div>
          ) : (
            unifiedMessages.map((message) => (
              <a
                key={message.id}
                href={message.link || '#'}
                target={message.link ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors cursor-pointer block ${
                  message.type === 'gmail' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-purple-500'
                } ${message.isUnread ? 'bg-white/90' : ''}`}
                data-testid={`message-${message.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'gmail' ? 'bg-red-100' : 'bg-purple-100'
                  }`}>
                    {message.type === 'gmail' ? (
                      <Mail className="w-5 h-5 text-red-600" />
                    ) : (
                      <MessageCircle className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${message.isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {message.title}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                    </div>
                    {message.subtitle && (
                      <h4 className={`text-sm mb-1 ${message.isUnread ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                        {message.subtitle}
                      </h4>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{message.preview}</p>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
