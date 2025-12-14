import { UnifiedSidebar } from "@/components/unified-sidebar";
import { ServiceCard } from "@/components/service-card";
import { FeedItem } from "@/components/feed-item";
import { Search, Bell, Mail, Video, MessageCircle } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery } from "@tanstack/react-query";
import type { Service, FeedItem as FeedItemType } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isAllDay: boolean;
}

interface ZoomMeeting {
  id: number;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
  type: number;
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

export default function Dashboard() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  
  const userName = user?.firstName || user?.email?.split("@")[0] || "there";

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await fetch("/api/services");
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });

  const { data: feedItems = [], isLoading: feedLoading } = useQuery<FeedItemType[]>({
    queryKey: ["feed"],
    queryFn: async () => {
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error("Failed to fetch feed items");
      return res.json();
    },
  });

  const { data: gmailMessages = [], isLoading: gmailLoading, isError: gmailError } = useQuery<GmailMessage[]>({
    queryKey: ["gmail-messages"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/messages", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 500) {
          console.warn("Gmail integration not available");
          return [];
        }
        throw new Error("Failed to fetch Gmail messages");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: calendarEvents = [], isLoading: calendarLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/events", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 500) {
          console.warn("Calendar integration not available");
          return [];
        }
        throw new Error("Failed to fetch calendar events");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: zoomMeetings = [], isLoading: zoomLoading } = useQuery<ZoomMeeting[]>({
    queryKey: ["zoom-meetings"],
    queryFn: async () => {
      const res = await fetch("/api/zoom/meetings", { credentials: "include" });
      if (!res.ok) {
        console.warn("Zoom integration not available");
        return [];
      }
      return res.json();
    },
    retry: false,
  });

  const { data: slackMessages = [], isLoading: slackLoading } = useQuery<SlackMessage[]>({
    queryKey: ["slack-messages"],
    queryFn: async () => {
      const res = await fetch("/api/slack/messages", { credentials: "include" });
      if (!res.ok) {
        console.warn("Slack integration not available");
        return [];
      }
      return res.json();
    },
    retry: false,
  });

  const formatSlackTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "";
    }
  };

  const formatZoomTime = (startTime: string) => {
    if (!startTime) return "No time set";
    try {
      const date = new Date(startTime);
      return date.toLocaleString("en-US", { 
        month: "short", 
        day: "numeric", 
        hour: "numeric", 
        minute: "2-digit" 
      });
    } catch {
      return startTime;
    }
  };

  const formatGmailTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const extractSenderName = (from: string) => {
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim().replace(/"/g, '') : from;
  };

  const formatEventTime = (startStr: string, endStr: string, isAllDay: boolean) => {
    if (isAllDay) return "All Day";
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return `${formatTime(start)} - ${formatTime(end)}`;
    } catch {
      return "";
    }
  };

  const isEventNow = (startStr: string, endStr: string, isAllDay: boolean) => {
    if (isAllDay) {
      try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        return startStr === todayStr || (startStr <= todayStr && endStr > todayStr);
      } catch {
        return false;
      }
    }
    try {
      const now = new Date();
      const start = new Date(startStr);
      const end = new Date(endStr);
      return now >= start && now <= end;
    } catch {
      return false;
    }
  };

  const formatEventStartTime = (startStr: string, isAllDay: boolean) => {
    if (isAllDay) return "All Day";
    try {
      const start = new Date(startStr);
      return start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const getIconName = (iconStr: string) => {
    const iconMap: Record<string, string> = {
      "MessageCircle": "MessageCircle",
      "Mail": "Mail",
      "Calendar": "Calendar",
      "Video": "Video",
    };
    return iconMap[iconStr] || "Calendar";
  };

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
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{today}</p>
            <h1 className="font-display font-bold text-3xl">{getGreeting()}, {userName}</h1>
          </div>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors" data-testid="button-search">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors relative" data-testid="button-notifications">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {servicesLoading ? (
            <div className="col-span-5 text-center text-muted-foreground">Loading services...</div>
          ) : (
            services.map((service) => (
              <ServiceCard 
                key={service.id}
                id={service.id}
                name={service.name}
                description={service.description}
                icon={getIconName(service.icon)}
                colorClass={service.colorClass}
                connected={service.connected}
              />
            ))
          )}
        </section>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-xl">Unified Feed</h2>
              <div className="flex gap-2 text-sm">
                <button className="px-3 py-1.5 rounded-full bg-white shadow-sm text-foreground font-medium" data-testid="button-filter-all">All</button>
                <button className="px-3 py-1.5 rounded-full text-muted-foreground hover:bg-white/50 transition-colors" data-testid="button-filter-mentions">Mentions</button>
                <button className="px-3 py-1.5 rounded-full text-muted-foreground hover:bg-white/50 transition-colors" data-testid="button-filter-unread">Unread</button>
              </div>
            </div>

            <div className="space-y-3">
              {(feedLoading || gmailLoading || zoomLoading || slackLoading) ? (
                <div className="text-center text-muted-foreground py-8">Loading feed...</div>
              ) : (feedItems.length === 0 && gmailMessages.length === 0 && zoomMeetings.length === 0 && slackMessages.length === 0) ? (
                <div className="text-center text-muted-foreground py-8">No feed items yet</div>
              ) : (
                <>
                  {zoomMeetings.map((meeting) => (
                    <a 
                      key={`zoom-${meeting.id}`}
                      href={meeting.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors cursor-pointer block border-l-4 border-l-blue-500"
                      data-testid={`feed-zoom-${meeting.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Video className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-foreground">Zoom Meeting</span>
                            <span className="text-xs text-muted-foreground">{formatZoomTime(meeting.startTime)}</span>
                          </div>
                          <h4 className="text-sm font-medium text-foreground mb-1">{meeting.topic}</h4>
                          <p className="text-xs text-muted-foreground">{meeting.duration} minutes</p>
                        </div>
                      </div>
                    </a>
                  ))}
                  {gmailMessages.map((email) => (
                    <div 
                      key={`gmail-${email.id}`}
                      className={`glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors cursor-pointer ${email.isUnread ? 'border-l-4 border-l-red-500' : ''}`}
                      data-testid={`feed-gmail-${email.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm ${email.isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                              {extractSenderName(email.from)}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatGmailTime(email.date)}</span>
                          </div>
                          <h4 className={`text-sm mb-1 ${email.isUnread ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                            {email.subject}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">{email.snippet}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {slackMessages.map((message) => (
                    <a 
                      key={`slack-${message.id}`}
                      href={message.permalink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors cursor-pointer block border-l-4 border-l-purple-500"
                      data-testid={`feed-slack-${message.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-foreground">#{message.channelName}</span>
                            <span className="text-xs text-muted-foreground">{formatSlackTime(message.timestamp)}</span>
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">{message.text}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                  {feedItems.map((item) => (
                    <FeedItem 
                      key={item.id} 
                      type={item.type as any}
                      title={item.title}
                      subtitle={item.subtitle || undefined}
                      time={item.time}
                      sender={item.sender || undefined}
                      avatar={item.avatar || undefined}
                      urgent={item.urgent}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="font-display font-semibold text-lg mb-4">Upcoming</h3>
              
              {calendarLoading ? (
                <div className="text-center text-muted-foreground py-4">Loading events...</div>
              ) : calendarEvents.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">No upcoming events</div>
              ) : (
                <div className="relative pl-4 border-l-2 border-primary/20 space-y-6">
                  {calendarEvents.slice(0, 5).map((event, index) => {
                    const isNow = isEventNow(event.start, event.end, event.isAllDay);
                    return (
                      <div key={event.id} className="relative" data-testid={`calendar-event-${event.id}`}>
                        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-white ${isNow ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        {isNow ? (
                          <p className="text-xs text-primary font-bold mb-1">NOW</p>
                        ) : (
                          <p className="text-xs text-muted-foreground font-semibold mb-1">{formatEventStartTime(event.start, event.isAllDay)}</p>
                        )}
                        <h4 className="font-medium text-foreground">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatEventTime(event.start, event.end, event.isAllDay)}
                        </p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground">{event.location}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border-primary/10">
              <h3 className="font-display font-semibold text-lg mb-2">Quick Compose</h3>
              <p className="text-sm text-muted-foreground mb-4">Send a message to any connected service.</p>
              <button className="w-full py-2.5 rounded-lg bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors" data-testid="button-new-message">
                New Message
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
