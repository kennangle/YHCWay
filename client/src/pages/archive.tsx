import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { Mail, MessageCircle, Users, Archive, RotateCcw, Loader2 } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface ArchivedEmail {
  id: number;
  userId: string;
  emailId: string;
  threadId?: string;
  subject?: string;
  from?: string;
  snippet?: string;
  date?: string;
  isUnread?: boolean;
  archivedAt: string;
}

interface ArchivedSlackMessage {
  id: number;
  userId: string;
  messageId: string;
  channelId?: string;
  channelName?: string;
  text?: string;
  userName?: string;
  timestamp?: string;
  isDm?: boolean;
  archivedAt: string;
}

type FilterType = 'all' | 'emails' | 'slack';

export default function ArchivePage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const queryClient = useQueryClient();

  const { data: archivedEmails = [], isLoading: emailsLoading } = useQuery<ArchivedEmail[]>({
    queryKey: ["archived-emails"],
    queryFn: async () => {
      const res = await fetch("/api/archive/emails", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: archivedSlackMessages = [], isLoading: slackLoading } = useQuery<ArchivedSlackMessage[]>({
    queryKey: ["archived-slack"],
    queryFn: async () => {
      const res = await fetch("/api/archive/slack", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const unarchiveEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const res = await fetch(`/api/archive/emails/${emailId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to unarchive");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-emails"] });
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
    },
  });

  const unarchiveSlackMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/archive/slack/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to unarchive");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-slack"] });
      queryClient.invalidateQueries({ queryKey: ["slack-messages"] });
    },
  });

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  const isLoading = emailsLoading || slackLoading;

  const allItems = [
    ...archivedEmails.map((email) => ({
      id: `email-${email.emailId}`,
      type: 'email' as const,
      title: email.from || 'Unknown Sender',
      subtitle: email.subject || 'No Subject',
      preview: email.snippet || '',
      archivedAt: new Date(email.archivedAt),
      originalId: email.emailId,
    })),
    ...archivedSlackMessages.map((msg) => ({
      id: `slack-${msg.messageId}`,
      type: 'slack' as const,
      title: msg.isDm ? (msg.channelName || 'DM') : `#${msg.channelName || 'channel'}`,
      subtitle: msg.userName || '',
      preview: msg.text || '',
      archivedAt: new Date(msg.archivedAt),
      originalId: msg.messageId,
      isDm: msg.isDm,
    })),
  ].sort((a, b) => b.archivedAt.getTime() - a.archivedAt.getTime());

  const filteredItems = allItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'emails') return item.type === 'email';
    if (filter === 'slack') return item.type === 'slack';
    return true;
  });

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

      <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-8">
          <header className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Archive className="w-8 h-8 text-primary" />
              <h1 className="font-display font-bold text-3xl">Archive</h1>
            </div>
            <p className="text-muted-foreground">
              {allItems.length} archived item{allItems.length !== 1 ? 's' : ''}
            </p>
          </header>

          <div className="flex gap-2 mb-6">
            <button 
              className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'all' ? 'bg-white shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`} 
              onClick={() => setFilter('all')}
              data-testid="button-filter-all"
            >
              All
            </button>
            <button 
              className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'emails' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
              onClick={() => setFilter('emails')}
              data-testid="button-filter-emails"
            >
              <Mail className="w-4 h-4 inline mr-2" />Emails
            </button>
            <button 
              className={`px-4 py-2 rounded-full font-medium transition-colors ${filter === 'slack' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
              onClick={() => setFilter('slack')}
              data-testid="button-filter-slack"
            >
              <MessageCircle className="w-4 h-4 inline mr-2" />Slack
            </button>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-12">Loading archived items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No archived items yet</p>
                <p className="text-sm mt-2">Archive emails and Slack messages from your inbox to keep things organized</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const borderColor = item.type === 'email' ? 'border-l-red-500' : 'border-l-purple-500';
                const bgColor = item.type === 'email' ? 'bg-red-100' : 'bg-purple-100';
                const iconColor = item.type === 'email' ? 'text-red-600' : 'text-purple-600';
                const isUnarchiving = item.type === 'email' 
                  ? unarchiveEmailMutation.isPending 
                  : unarchiveSlackMutation.isPending;
                
                return (
                  <div
                    key={item.id}
                    className={`glass-panel p-4 rounded-xl border-l-4 ${borderColor}`}
                    data-testid={`archived-${item.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                        {item.type === 'email' ? (
                          <Mail className={`w-5 h-5 ${iconColor}`} />
                        ) : (item as any).isDm ? (
                          <Users className={`w-5 h-5 ${iconColor}`} />
                        ) : (
                          <MessageCircle className={`w-5 h-5 ${iconColor}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            {item.title}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Archived {formatTime(item.archivedAt.toISOString())}
                            </span>
                            <button
                              onClick={() => {
                                if (item.type === 'email') {
                                  unarchiveEmailMutation.mutate(item.originalId);
                                } else {
                                  unarchiveSlackMutation.mutate(item.originalId);
                                }
                              }}
                              disabled={isUnarchiving}
                              className="p-1.5 rounded-lg hover:bg-white/80 transition-colors text-muted-foreground hover:text-primary"
                              title="Restore to inbox"
                              data-testid={`button-unarchive-${item.id}`}
                            >
                              {isUnarchiving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {item.subtitle && (
                          <h4 className="text-sm mb-1 text-foreground">
                            {item.subtitle}
                          </h4>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.preview}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
