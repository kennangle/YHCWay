import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { FeedItem } from "@/components/feed-item";
import { Search, Bell, Mail, Video, MessageCircle, Users, MessageSquare, CheckSquare, RefreshCw, X, Gift, AlertTriangle, TrendingUp, Plus, Send, CalendarPlus, Share2, Trash2 } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { FeedItem as FeedItemType, SharedItem, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DraggableDashboard, getDefaultWidgets, WidgetConfig, WidgetId } from "@/components/draggable-dashboard";
import { TimeTrackerWidget } from "@/components/time-tracker-widget";
import { AIAssistantPanel } from "@/components/ai-assistant-panel";
import { Brain } from "lucide-react";
import { toast } from "sonner";

type FilterType = "all" | "mentions" | "unread";
type ServiceFilter = "all" | "gmail" | "slack" | "zoom" | "calendar" | "intro-offer";

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
  source?: "google" | "calendly";
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
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
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
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const today = currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const timeStr = currentTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const { data: userPrefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const res = await fetch("/api/preferences", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const widgetConfigs = useMemo<WidgetConfig[]>(() => {
    const defaults = getDefaultWidgets();
    if (userPrefs?.dashboardWidgets) {
      const stored = userPrefs.dashboardWidgets as WidgetConfig[];
      const storedIds = new Set(stored.map(w => w.id));
      const newWidgets = defaults.filter(d => !storedIds.has(d.id)).map((w, i) => ({
        ...w,
        order: stored.length + i,
      }));
      return [...stored, ...newWidgets];
    }
    return defaults;
  }, [userPrefs?.dashboardWidgets]);

  const saveWidgetsMutation = useMutation({
    mutationFn: async (widgets: WidgetConfig[]) => {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dashboardWidgets: widgets }),
      });
      if (!res.ok) throw new Error("Failed to save widget preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });

  const slackReplyMutation = useMutation({
    mutationFn: async ({ channelId, message, threadTs }: { channelId: string; message: string; threadTs?: string }) => {
      const res = await fetch("/api/slack/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channelId, message, threadTs }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send reply");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success("Reply sent!");
      setReplyingToMessage(null);
      setReplyTexts(prev => {
        const updated = { ...prev };
        delete updated[variables.channelId];
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ["slack-messages"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send reply");
    },
  });

  const isWidgetVisible = useCallback((widgetId: WidgetId) => {
    const widget = widgetConfigs.find(w => w.id === widgetId);
    return widget?.visible !== false;
  }, [widgetConfigs]);

  const getWidgetOrder = useCallback((widgetId: WidgetId): number => {
    const widget = widgetConfigs.find(w => w.id === widgetId);
    return widget?.order ?? 999;
  }, [widgetConfigs]);
  
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
      // Fetch all offers for accurate dashboard counts (limit=100)
      const res = await fetch("/api/mindbody-analytics/intro-offers?limit=100", { credentials: "include" });
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

  const { data: sharedItems = [] } = useQuery<(SharedItem & { sharedBy: User })[]>({
    queryKey: ["shared-items"],
    queryFn: async () => {
      const res = await fetch("/api/shared-items", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const deleteSharedItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/shared-items/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-items"] });
      toast.success("Removed from shared items");
    },
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

  const formatEventDate = (startStr: string) => {
    try {
      const start = new Date(startStr);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (start.toDateString() === today.toDateString()) {
        return "Today";
      } else if (start.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
      } else {
        return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
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
    
    if (serviceFilter !== "all") {
      items = items.filter(item => item.type === serviceFilter);
    }
    
    return items;
  }, [unifiedFeed, activeFilter, serviceFilter, searchQuery, getItemSearchText]);

  const serviceFilterOptions = [
    { value: "all", label: "All Services", icon: null },
    { value: "gmail", label: "Gmail", count: gmailMessages.length },
    { value: "slack", label: "Slack", count: slackMessages.length },
    { value: "zoom", label: "Zoom", count: zoomMeetings.length },
    { value: "intro-offer", label: "Intro Offers", count: introOffers.length },
  ] as const;

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
      
        <div className="flex-1 p-4 md:p-8 relative z-10">
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

        {/* Draggable Widget Dashboard */}
        <DraggableDashboard 
          widgets={widgetConfigs}
          onWidgetsChange={(widgets) => saveWidgetsMutation.mutate(widgets)}
        />

        {/* Shared with Team Section */}
        {sharedItems.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Shared with Team
              </h3>
              <span className="text-sm text-muted-foreground">{sharedItems.length} items</span>
            </div>
            <div className="space-y-3">
              {sharedItems.slice(0, 5).map((item) => {
                const isEmail = item.itemType === "email";
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl bg-white/60 border-l-4 ${isEmail ? 'border-l-red-400' : 'border-l-purple-400'} hover:bg-white/80 transition-colors`}
                    data-testid={`shared-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isEmail ? 'bg-red-100' : 'bg-purple-100'}`}>
                          {isEmail ? (
                            <Mail className="w-4 h-4 text-red-600" />
                          ) : (
                            <MessageCircle className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{item.title}</p>
                          {item.preview && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.preview}</p>
                          )}
                          {item.note && (
                            <p className="text-xs text-primary mt-1 italic">"{item.note}"</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Shared by {item.sharedBy?.firstName || item.sharedBy?.email?.split('@')[0] || 'Team member'} · {formatRelativeTime(new Date(item.sharedAt!))}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteSharedItemMutation.mutate(item.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-muted-foreground hover:text-red-600"
                        title="Remove"
                        data-testid={`button-remove-shared-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>

      {/* AI Assistant Floating Button */}
      <button
        onClick={() => setAiPanelOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-primary to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        data-testid="button-open-ai-assistant"
      >
        <Brain className="w-6 h-6" />
      </button>

      {/* AI Assistant Panel */}
      {aiPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/30" 
            onClick={() => setAiPanelOpen(false)}
          />
          <div className="relative w-full max-w-xl h-full animate-in slide-in-from-right duration-300">
            <AIAssistantPanel />
          </div>
        </div>
      )}
    </div>
  );
}
