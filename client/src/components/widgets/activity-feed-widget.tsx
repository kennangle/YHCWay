import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle, Video, Bell, Gift } from "lucide-react";
import type { FeedItem as FeedItemType } from "@shared/schema";

interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

interface SlackMessage {
  id: string;
  channelName: string;
  text: string;
  timestamp: string;
  isDm?: boolean;
}

interface ZoomMeeting {
  id: number;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
}

interface IntroOffer {
  id: string;
  firstName: string;
  lastName: string;
  offerName: string;
  purchaseDate: string;
  memberStatus: string;
}

interface UnifiedActivityItem {
  id: string;
  type: "gmail" | "slack" | "zoom" | "intro-offer" | "feed";
  isUnread: boolean;
  timestamp: Date;
  data: GmailMessage | SlackMessage | ZoomMeeting | IntroOffer | FeedItemType;
}

function formatRelativeTime(date: Date): string {
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
}

export function ActivityFeedWidget() {
  const { data: feedItemsRaw = [] } = useQuery<FeedItemType[]>({
    queryKey: ["feed"],
    queryFn: async () => {
      const res = await fetch("/api/feed");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: gmailMessagesRaw = [] } = useQuery<GmailMessage[]>({
    queryKey: ["gmail-messages"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/messages", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    retry: false,
  });

  const { data: slackMessagesRaw = [] } = useQuery<SlackMessage[]>({
    queryKey: ["slack-messages"],
    queryFn: async () => {
      const res = await fetch("/api/slack/messages", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    retry: false,
  });

  const { data: zoomMeetingsRaw = [] } = useQuery<ZoomMeeting[]>({
    queryKey: ["zoom-meetings"],
    queryFn: async () => {
      const res = await fetch("/api/zoom/meetings", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    retry: false,
  });

  const { data: introOffersRaw = [] } = useQuery<IntroOffer[]>({
    queryKey: ["intro-offers-feed"],
    queryFn: async () => {
      const res = await fetch("/api/mindbody-analytics/intro-offers", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    },
  });

  const feedItems = Array.isArray(feedItemsRaw) ? feedItemsRaw : [];
  const gmailMessages = Array.isArray(gmailMessagesRaw) ? gmailMessagesRaw : [];
  const slackMessages = Array.isArray(slackMessagesRaw) ? slackMessagesRaw : [];
  const zoomMeetings = Array.isArray(zoomMeetingsRaw) ? zoomMeetingsRaw : [];
  const introOffers = Array.isArray(introOffersRaw) ? introOffersRaw : [];

  const unifiedFeed: UnifiedActivityItem[] = [
    ...gmailMessages.slice(0, 5).map((msg) => ({
      id: `gmail-${msg.id}`,
      type: "gmail" as const,
      isUnread: msg.isUnread,
      timestamp: new Date(msg.date),
      data: msg,
    })),
    ...slackMessages.slice(0, 5).map((msg) => ({
      id: `slack-${msg.id}`,
      type: "slack" as const,
      isUnread: true,
      timestamp: new Date(msg.timestamp),
      data: msg,
    })),
    ...zoomMeetings.slice(0, 3).map((meeting) => ({
      id: `zoom-${meeting.id}`,
      type: "zoom" as const,
      isUnread: true,
      timestamp: new Date(meeting.startTime),
      data: meeting,
    })),
    ...introOffers.slice(0, 3).map((offer) => ({
      id: `intro-${offer.id}`,
      type: "intro-offer" as const,
      isUnread: offer.memberStatus === "new" || offer.memberStatus === "at_risk",
      timestamp: new Date(offer.purchaseDate),
      data: offer,
    })),
    ...feedItems.slice(0, 5).map((item) => ({
      id: `feed-${item.id}`,
      type: "feed" as const,
      isUnread: true,
      timestamp: new Date(item.timestamp!),
      data: item,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (unifiedFeed.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No recent activity</div>;
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {unifiedFeed.slice(0, 10).map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
            item.isUnread ? "bg-blue-50/50" : "bg-white/60"
          } hover:bg-white/80`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              item.type === "gmail"
                ? "bg-red-100"
                : item.type === "slack"
                  ? "bg-purple-100"
                  : item.type === "zoom"
                    ? "bg-blue-100"
                    : item.type === "intro-offer"
                      ? "bg-amber-100"
                      : "bg-gray-100"
            }`}
          >
            {item.type === "gmail" && <Mail className="w-4 h-4 text-red-600" />}
            {item.type === "slack" && <MessageCircle className="w-4 h-4 text-purple-600" />}
            {item.type === "zoom" && <Video className="w-4 h-4 text-blue-600" />}
            {item.type === "intro-offer" && <Gift className="w-4 h-4 text-amber-600" />}
            {item.type === "feed" && <Bell className="w-4 h-4 text-gray-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {item.type === "gmail" && (item.data as GmailMessage).subject}
              {item.type === "slack" && (item.data as SlackMessage).text?.substring(0, 60)}
              {item.type === "zoom" && (item.data as ZoomMeeting).topic}
              {item.type === "intro-offer" && `${(item.data as IntroOffer).firstName} ${(item.data as IntroOffer).lastName} - ${(item.data as IntroOffer).offerName}`}
              {item.type === "feed" && (item.data as FeedItemType).title}
            </p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
