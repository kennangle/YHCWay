import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { FeedItem } from "@/components/feed-item";
import { Search, Bell, Mail, Video, MessageCircle, Users, MessageSquare, CheckSquare, RefreshCw, X, Gift, AlertTriangle, TrendingUp, Plus, Send, CalendarPlus } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedItem as FeedItemType } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { Input } from "@/components/ui/input";

type FilterType = "all" | "mentions" | "unread";

interface UnifiedActivityItem {
  id: string;
  type: "gmail" | "slack" | "zoom" | "feed" | "intro-offer";
  isUnread: boolean;
  hasMention: boolean;
  timestamp: Date;
  data: any;
}

interface IntroOffer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  offerName: string;
  purchaseDate: string;
  memberStatus: string;
  classesAttendedSincePurchase: number;
  daysSincePurchase: number;
}

interface AsanaTask {
  id: string;
  name: string;
  completed: boolean;
  dueOn: string | null;
  dueAt: string | null;
  assignee: { name: string; email?: string } | null;
  projectName: string | null;
  notes: string;
  permalink: string;
  createdAt: string;
  modifiedAt: string;
}

interface NativeTask {
  id: number;
  projectId: number | null;
  title: string;
  priority: string;
  dueDate: string | null;
  isCompleted: boolean;
}

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
  threadTs?: string;
  replyCount?: number;
  isDm?: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { playNotification } = useNotificationSound();
  const prevItemCountRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const today = currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const timeStr = currentTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationsOpen]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    isInitialLoadRef.current = true;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
      queryClient.invalidateQueries({ queryKey: ["zoom-meetings"] }),
      queryClient.invalidateQueries({ queryKey: ["slack-messages"] }),
      queryClient.invalidateQueries({ queryKey: ["asana-tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["intro-offers-feed"] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [queryClient]);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  
  const userName = user?.firstName || user?.email?.split("@")[0] || "there";

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
      const res = await fetch("/api/slack/messages?includeDms=true", { credentials: "include" });
      if (!res.ok) {
        console.warn("Slack integration not available");
        return [];
      }
      return res.json();
    },
    retry: false,
  });

  const { data: asanaTasks = [], isLoading: asanaLoading } = useQuery<AsanaTask[]>({
    queryKey: ["asana-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/asana/tasks", { credentials: "include" });
      if (!res.ok) {
        console.warn("Asana integration not available");
        return [];
      }
      return res.json();
    },
    retry: false,
  });

  const { data: introOffersData } = useQuery<{ data: IntroOffer[] }>({
    queryKey: ["intro-offers-feed"],
    queryFn: async () => {
      const res = await fetch("/api/mindbody-analytics/intro-offers?limit=10", { credentials: "include" });
      if (!res.ok) {
        console.warn("Mindbody Analytics not available");
        return { data: [] };
      }
      return res.json();
    },
    retry: false,
  });
  const introOffers = introOffersData?.data || [];

  const { data: upcomingTasks = [] } = useQuery<NativeTask[]>({
    queryKey: ["upcoming-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/upcoming?days=7", { credentials: "include" });
      if (!res.ok) return [];
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

  const formatRelativeTime = (date: Date) => {
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "";
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

  const detectMention = (text: string, userEmail?: string | null): boolean => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    if (lowerText.includes('@')) {
      if (userEmail && lowerText.includes(userEmail.toLowerCase())) return true;
      if (user?.firstName && lowerText.includes(`@${user.firstName.toLowerCase()}`)) return true;
      if (lowerText.includes('mentioned you')) return true;
    }
    return false;
  };

  const unifiedFeed = useMemo((): UnifiedActivityItem[] => {
    const items: UnifiedActivityItem[] = [];
    
    gmailMessages.forEach(email => {
      items.push({
        id: `gmail-${email.id}`,
        type: "gmail",
        isUnread: email.isUnread,
        hasMention: detectMention(email.subject + ' ' + email.snippet, user?.email),
        timestamp: new Date(email.date),
        data: email,
      });
    });
    
    slackMessages.forEach(msg => {
      items.push({
        id: `slack-${msg.id}`,
        type: "slack",
        isUnread: false,
        hasMention: detectMention(msg.text, user?.email) || msg.isDm === true,
        timestamp: new Date(msg.timestamp),
        data: msg,
      });
    });
    
    zoomMeetings.forEach(meeting => {
      items.push({
        id: `zoom-${meeting.id}`,
        type: "zoom",
        isUnread: false,
        hasMention: false,
        timestamp: new Date(meeting.startTime),
        data: meeting,
      });
    });
    
    feedItems.forEach(item => {
      items.push({
        id: `feed-${item.id}`,
        type: "feed",
        isUnread: item.urgent || false,
        hasMention: detectMention(item.title + ' ' + (item.subtitle || ''), user?.email),
        timestamp: new Date(item.timestamp),
        data: item,
      });
    });

    introOffers.forEach(offer => {
      items.push({
        id: `intro-offer-${offer.id}`,
        type: "intro-offer",
        isUnread: offer.memberStatus === "new" || offer.memberStatus === "at_risk",
        hasMention: false,
        timestamp: new Date(offer.purchaseDate),
        data: offer,
      });
    });
    
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [gmailMessages, slackMessages, zoomMeetings, feedItems, introOffers, user]);

  useEffect(() => {
    const currentCount = unifiedFeed.length;
    
    if (isInitialLoadRef.current) {
      prevItemCountRef.current = currentCount;
      isInitialLoadRef.current = false;
      return;
    }
    
    if (currentCount > prevItemCountRef.current) {
      playNotification();
    }
    
    prevItemCountRef.current = currentCount;
  }, [unifiedFeed.length, playNotification]);

  const getItemSearchText = useCallback((item: UnifiedActivityItem): string => {
    if (item.type === "gmail") {
      const email = item.data as GmailMessage;
      return `${email.subject} ${email.from} ${email.snippet}`.toLowerCase();
    }
    if (item.type === "slack") {
      const msg = item.data as SlackMessage;
      return `${msg.text} ${msg.userName} ${msg.channelName}`.toLowerCase();
    }
    if (item.type === "zoom") {
      const meeting = item.data as ZoomMeeting;
      return meeting.topic.toLowerCase();
    }
    if (item.type === "feed") {
      const feed = item.data as FeedItemType;
      return `${feed.title} ${feed.subtitle || ""}`.toLowerCase();
    }
    if (item.type === "intro-offer") {
      const offer = item.data as IntroOffer;
      return `${offer.firstName} ${offer.lastName} ${offer.offerName}`.toLowerCase();
    }
    return "";
  }, []);

  const filteredFeed = useMemo(() => {
    let items = unifiedFeed;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => getItemSearchText(item).includes(query));
    }
    
    if (activeFilter === "mentions") items = items.filter(item => item.hasMention);
    if (activeFilter === "unread") items = items.filter(item => item.isUnread);
    
    return items;
  }, [unifiedFeed, activeFilter, searchQuery, getItemSearchText]);

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
        <div className="flex-1 p-4 md:p-8">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{today} · {timeStr}</p>
            <h1 className="font-display font-bold text-3xl">{getGreeting()}, {userName}</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors disabled:opacity-50" 
              data-testid="button-refresh"
              title="Refresh all data"
            >
              <RefreshCw className={`w-5 h-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {searchOpen ? (
              <div ref={searchContainerRef} className="flex items-center gap-2 glass-panel rounded-full px-3 py-1">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search activity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent h-8 w-48 focus-visible:ring-0 px-0"
                  data-testid="input-search"
                />
                <button 
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  className="p-1 hover:bg-white/50 rounded-full"
                  data-testid="button-search-close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setSearchOpen(true)}
                className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors" 
                data-testid="button-search"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors relative" 
                data-testid="button-notifications"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unifiedFeed.filter(i => i.isUnread).length > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-80 glass-panel rounded-xl shadow-lg border border-white/20 overflow-hidden z-50">
                  <div className="p-3 border-b border-white/10">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {unifiedFeed.slice(0, 5).map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-3 border-b border-white/10 hover:bg-white/50 cursor-pointer ${item.isUnread ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            item.type === 'gmail' ? 'bg-red-100' : 
                            item.type === 'slack' ? 'bg-purple-100' : 
                            item.type === 'zoom' ? 'bg-blue-100' : 
                            item.type === 'intro-offer' ? 'bg-purple-100' : 'bg-gray-100'
                          }`}>
                            {item.type === 'gmail' && <Mail className="w-4 h-4 text-red-600" />}
                            {item.type === 'slack' && <MessageCircle className="w-4 h-4 text-purple-600" />}
                            {item.type === 'zoom' && <Video className="w-4 h-4 text-blue-600" />}
                            {item.type === 'intro-offer' && <Gift className="w-4 h-4 text-purple-600" />}
                            {item.type === 'feed' && <Bell className="w-4 h-4 text-gray-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.type === 'gmail' && (item.data as GmailMessage).subject}
                              {item.type === 'slack' && (item.data as SlackMessage).text?.substring(0, 50)}
                              {item.type === 'zoom' && (item.data as ZoomMeeting).topic}
                              {item.type === 'intro-offer' && `${(item.data as IntroOffer).firstName} ${(item.data as IntroOffer).lastName} - ${(item.data as IntroOffer).offerName}`}
                              {item.type === 'feed' && (item.data as FeedItemType).title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(item.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {unifiedFeed.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="glass-panel p-6 rounded-2xl mb-8">
          <h3 className="font-display font-semibold text-lg mb-4">Upcoming Events</h3>
          
          {calendarLoading ? (
            <div className="text-center text-muted-foreground py-4">Loading events...</div>
          ) : calendarEvents.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">No upcoming events</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {calendarEvents.slice(0, 10).map((event) => {
                const isNow = isEventNow(event.start, event.end, event.isAllDay);
                return (
                  <Link key={event.id} href="/calendar" data-testid={`upcoming-event-${event.id}`}>
                    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 rounded-lg bg-white/60 border border-white/30 hover:bg-white/80 transition-colors cursor-pointer">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isNow ? 'bg-primary animate-pulse' : 'bg-green-500'}`}></div>
                      <span className={`text-xs font-semibold flex-shrink-0 ${isNow ? 'text-primary' : 'text-muted-foreground'}`}>
                        {isNow ? 'NOW' : formatEventStartTime(event.start, event.isAllDay)}
                      </span>
                      <span className="font-medium text-foreground text-sm truncate max-w-48">{event.title}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatEventTime(event.start, event.end, event.isAllDay)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* At-Risk Students */}
          <Link href="/intro-offers?filter=needs_attention" className="block" data-testid="insight-at-risk">
            <div className="glass-panel p-5 rounded-xl border-l-4 border-l-amber-500 hover:bg-white/80 transition-colors cursor-pointer h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Needs Attention</h3>
                  <p className="text-2xl font-bold text-amber-600">
                    {introOffers.filter(o => o.memberStatus === "at_risk" || o.memberStatus === "lapsed").length}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {introOffers.filter(o => o.memberStatus === "at_risk").length} at-risk, {introOffers.filter(o => o.memberStatus === "lapsed").length} lapsed students
              </p>
            </div>
          </Link>

          {/* New Intro Offers */}
          <Link href="/intro-offers?filter=new" className="block" data-testid="insight-new-offers">
            <div className="glass-panel p-5 rounded-xl border-l-4 border-l-green-500 hover:bg-white/80 transition-colors cursor-pointer h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">New This Week</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {introOffers.filter(o => o.daysSincePurchase <= 7).length}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {introOffers.filter(o => o.memberStatus === "engaged").length} engaged, {introOffers.filter(o => o.memberStatus === "new").length} awaiting first class
              </p>
            </div>
          </Link>

          {/* Quick Actions */}
          <div className="glass-panel p-5 rounded-xl h-full">
            <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/email-builder" data-testid="quick-action-email">
                <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                  <Send className="w-3.5 h-3.5" />
                  Compose Email
                </button>
              </Link>
              <Link href="/calendar" data-testid="quick-action-event">
                <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                  <CalendarPlus className="w-3.5 h-3.5" />
                  New Event
                </button>
              </Link>
              <Link href="/projects" data-testid="quick-action-task">
                <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  View Projects
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Upcoming Tasks Section */}
        {upcomingTasks.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg">Upcoming Tasks</h3>
              <Link href="/projects">
                <button className="text-sm text-primary hover:underline">View All</button>
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {upcomingTasks.slice(0, 6).map((task) => {
                const priorityColors: Record<string, string> = {
                  low: "border-gray-300",
                  medium: "border-blue-400",
                  high: "border-orange-400",
                  urgent: "border-red-500",
                };
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                const isOverdue = dueDate && dueDate < new Date() && !task.isCompleted;
                return (
                  <Link key={task.id} href="/projects" data-testid={`upcoming-task-${task.id}`}>
                    <div className={`flex-shrink-0 px-4 py-3 rounded-lg bg-white/60 border-l-4 ${priorityColors[task.priority]} hover:bg-white/80 transition-colors cursor-pointer min-w-48`}>
                      <p className={`font-medium text-sm ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </p>
                      {dueDate && (
                        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {isOverdue ? 'Overdue: ' : 'Due: '}{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-xl">Service Summary</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
              <Link href="/inbox" data-testid="link-gmail-card">
                <div className="glass-panel p-3 md:p-5 rounded-xl border-l-4 border-l-red-500 cursor-pointer hover:bg-white/80 transition-colors h-full">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm md:text-base">Gmail</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {gmailLoading ? "Loading..." : gmailError ? "Not connected" : `${gmailMessages.filter(m => m.isUnread).length} unread, ${gmailMessages.length} total`}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/calendar" data-testid="link-calendar-card">
                <div className="glass-panel p-3 md:p-5 rounded-xl border-l-4 border-l-green-500 cursor-pointer hover:bg-white/80 transition-colors h-full">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm md:text-base">Calendar</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {calendarLoading ? "Loading..." : `${calendarEvents.length} upcoming`}
                      </p>
                      {calendarEvents.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Next: {calendarEvents[0]?.title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>

              <div className="glass-panel p-3 md:p-5 rounded-xl border-l-4 border-l-blue-500 h-full">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Video className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm md:text-base">Zoom</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {zoomLoading ? "Loading..." : `${zoomMeetings.length} meetings`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-3 md:p-5 rounded-xl border-l-4 border-l-purple-500 h-full">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm md:text-base">Slack</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {slackLoading ? "Loading..." : `${slackMessages.length} messages`}
                    </p>
                    {slackMessages.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        #{slackMessages[0]?.channelName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Link href="/projects" data-testid="link-projects-card">
                <div className="glass-panel p-3 md:p-5 rounded-xl border-l-4 border-l-primary cursor-pointer hover:bg-white/80 transition-colors h-full">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm md:text-base">Projects</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {upcomingTasks.length} tasks
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-xl">Recent Activity</h2>
              <div className="flex gap-2 text-sm">
                <button 
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activeFilter === "all" ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/50"}`}
                  data-testid="button-filter-all"
                >
                  All
                </button>
                <button 
                  onClick={() => setActiveFilter("mentions")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activeFilter === "mentions" ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/50"}`}
                  data-testid="button-filter-mentions"
                >
                  Mentions {unifiedFeed.filter(i => i.hasMention).length > 0 && `(${unifiedFeed.filter(i => i.hasMention).length})`}
                </button>
                <button 
                  onClick={() => setActiveFilter("unread")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activeFilter === "unread" ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/50"}`}
                  data-testid="button-filter-unread"
                >
                  Unread {unifiedFeed.filter(i => i.isUnread).length > 0 && `(${unifiedFeed.filter(i => i.isUnread).length})`}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(feedLoading || gmailLoading || zoomLoading || slackLoading) ? (
                <div className="text-center text-muted-foreground py-8">Loading activity...</div>
              ) : filteredFeed.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {activeFilter === "mentions" ? "No mentions found" : 
                   activeFilter === "unread" ? "No unread items" : 
                   "No recent activity"}
                </div>
              ) : (
                <>
                  {filteredFeed.map((item) => {
                    if (item.type === "zoom") {
                      const meeting = item.data as ZoomMeeting;
                      return (
                        <a 
                          key={item.id}
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
                      );
                    }
                    
                    if (item.type === "gmail") {
                      const email = item.data as GmailMessage;
                      return (
                        <div 
                          key={item.id}
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
                      );
                    }
                    
                    if (item.type === "slack") {
                      const message = item.data as SlackMessage;
                      return (
                        <a 
                          key={item.id}
                          href={message.permalink || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors cursor-pointer block border-l-4 ${message.isDm ? 'border-l-pink-500' : 'border-l-purple-500'}`}
                          data-testid={`feed-slack-${message.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${message.isDm ? 'bg-pink-100' : 'bg-purple-100'}`}>
                              {message.isDm ? (
                                <Users className="w-5 h-5 text-pink-600" />
                              ) : (
                                <MessageCircle className="w-5 h-5 text-purple-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">
                                    {message.isDm ? message.channelName : `#${message.channelName}`}
                                  </span>
                                  {message.isDm && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium">DM</span>
                                  )}
                                  {item.hasMention && !message.isDm && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">@mention</span>
                                  )}
                                  {message.replyCount && message.replyCount > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      {message.replyCount}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">{formatSlackTime(message.timestamp)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">{message.userName}</p>
                              <p className="text-sm text-foreground line-clamp-2">{message.text}</p>
                            </div>
                          </div>
                        </a>
                      );
                    }

                    if (item.type === "feed") {
                      const feedItem = item.data as FeedItemType;
                      return (
                        <FeedItem 
                          key={item.id}
                          type={feedItem.type as any}
                          title={feedItem.title}
                          subtitle={feedItem.subtitle || undefined}
                          time={feedItem.time}
                          sender={feedItem.sender || undefined}
                          avatar={feedItem.avatar || undefined}
                          urgent={feedItem.urgent}
                        />
                      );
                    }

                    if (item.type === "intro-offer") {
                      const offer = item.data as IntroOffer;
                      return (
                        <Link
                          key={item.id}
                          href="/intro-offers"
                          className="glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors cursor-pointer block border-l-4 border-l-purple-500"
                          data-testid={`feed-intro-offer-${offer.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Gift className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-foreground">Intro Offer</span>
                                <span className="text-xs text-muted-foreground">{formatGmailTime(offer.purchaseDate)}</span>
                              </div>
                              <h4 className="text-sm font-medium text-foreground mb-1">{offer.firstName} {offer.lastName}</h4>
                              <p className="text-xs text-muted-foreground">
                                {offer.offerName} - {offer.memberStatus} ({offer.classesAttendedSincePurchase} classes)
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    }
                    
                    return null;
                  })}
                </>
              )}
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
