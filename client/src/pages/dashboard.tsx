import { useState, useMemo, useRef, useEffect } from "react";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { FeedItem } from "@/components/feed-item";
import { Search, Bell, Mail, Video, MessageCircle, Users, MessageSquare, CheckSquare } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery } from "@tanstack/react-query";
import type { FeedItem as FeedItemType } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useNotificationSound } from "@/hooks/useNotificationSound";

type FilterType = "all" | "mentions" | "unread";

interface UnifiedActivityItem {
  id: string;
  type: "gmail" | "slack" | "zoom" | "feed" | "asana";
  isUnread: boolean;
  hasMention: boolean;
  timestamp: Date;
  data: any;
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
  const { playNotification } = useNotificationSound();
  const prevItemCountRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  
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

    asanaTasks.forEach(task => {
      items.push({
        id: `asana-${task.id}`,
        type: "asana",
        isUnread: !task.completed && task.dueOn !== null,
        hasMention: task.assignee?.email === user?.email,
        timestamp: new Date(task.modifiedAt || task.createdAt),
        data: task,
      });
    });
    
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [gmailMessages, slackMessages, zoomMeetings, feedItems, asanaTasks, user]);

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

  const filteredFeed = useMemo(() => {
    if (activeFilter === "all") return unifiedFeed;
    if (activeFilter === "mentions") return unifiedFeed.filter(item => item.hasMention);
    if (activeFilter === "unread") return unifiedFeed.filter(item => item.isUnread);
    return unifiedFeed;
  }, [unifiedFeed, activeFilter]);

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

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-xl">Service Summary</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Link href="/inbox" data-testid="link-gmail-card">
                <div className="glass-panel p-5 rounded-xl border-l-4 border-l-red-500 cursor-pointer hover:bg-white/80 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Gmail</h3>
                      <p className="text-sm text-muted-foreground">
                        {gmailLoading ? "Loading..." : gmailError ? "Not connected" : `${gmailMessages.filter(m => m.isUnread).length} unread, ${gmailMessages.length} total`}
                      </p>
                    </div>
                  </div>
                  {!gmailError && gmailMessages.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Latest: {extractSenderName(gmailMessages[0]?.from || '')} - {gmailMessages[0]?.subject?.substring(0, 40)}...
                    </p>
                  )}
                </div>
              </Link>

              <Link href="/calendar" data-testid="link-calendar-card">
                <div className="glass-panel p-5 rounded-xl border-l-4 border-l-green-500 cursor-pointer hover:bg-white/80 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold">Google Calendar</h3>
                      <p className="text-sm text-muted-foreground">
                        {calendarLoading ? "Loading..." : `${calendarEvents.length} upcoming events`}
                      </p>
                    </div>
                  </div>
                  {calendarEvents.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Next: {calendarEvents[0]?.title}
                    </p>
                  )}
                </div>
              </Link>

              <div className="glass-panel p-5 rounded-xl border-l-4 border-l-blue-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Video className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Zoom</h3>
                    <p className="text-sm text-muted-foreground">
                      {zoomLoading ? "Loading..." : `${zoomMeetings.length} upcoming meetings`}
                    </p>
                  </div>
                </div>
                {zoomMeetings.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Next: {zoomMeetings[0]?.topic} - {formatZoomTime(zoomMeetings[0]?.startTime)}
                  </p>
                )}
              </div>

              <div className="glass-panel p-5 rounded-xl border-l-4 border-l-purple-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Slack</h3>
                    <p className="text-sm text-muted-foreground">
                      {slackLoading ? "Loading..." : `${slackMessages.length} recent messages`}
                    </p>
                  </div>
                </div>
                {slackMessages.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Latest in #{slackMessages[0]?.channelName}: {slackMessages[0]?.text?.substring(0, 40)}...
                  </p>
                )}
              </div>
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
                    
                    if (item.type === "asana") {
                      const task = item.data as AsanaTask;
                      const isDueSoon = task.dueOn && new Date(task.dueOn) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                      return (
                        <a 
                          key={item.id}
                          href={task.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors cursor-pointer block border-l-4 ${isDueSoon ? 'border-l-orange-500' : 'border-l-[#F06A6A]'}`}
                          data-testid={`feed-asana-${task.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#F06A6A]/10 flex items-center justify-center flex-shrink-0">
                              <CheckSquare className="w-5 h-5 text-[#F06A6A]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">{task.name}</span>
                                  {isDueSoon && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Due Soon</span>
                                  )}
                                </div>
                                {task.dueOn && (
                                  <span className="text-xs text-muted-foreground">Due {new Date(task.dueOn).toLocaleDateString()}</span>
                                )}
                              </div>
                              {task.projectName && (
                                <p className="text-xs text-muted-foreground mb-1">{task.projectName}</p>
                              )}
                              {task.notes && (
                                <p className="text-sm text-foreground line-clamp-2">{task.notes}</p>
                              )}
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
                    
                    return null;
                  })}
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
