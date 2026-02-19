import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle, Video, Gift } from "lucide-react";

interface GmailMessage {
  id: string;
  isUnread: boolean;
}

interface SlackMessage {
  id: string;
  isDm?: boolean;
}

interface ZoomMeeting {
  id: number;
  topic: string;
}

interface IntroOffer {
  id: string;
  memberStatus: string;
}

export function ServiceSummaryWidget() {
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

  const gmailMessages = Array.isArray(gmailMessagesRaw) ? gmailMessagesRaw : [];
  const slackMessages = Array.isArray(slackMessagesRaw) ? slackMessagesRaw : [];
  const zoomMeetings = Array.isArray(zoomMeetingsRaw) ? zoomMeetingsRaw : [];
  const introOffers = Array.isArray(introOffersRaw) ? introOffersRaw : [];
  const gmailLoading = false;
  const slackLoading = false;
  const zoomLoading = false;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Gmail Card */}
      <Link href="/inbox" data-testid="card-gmail">
        <div className="glass-panel p-5 rounded-xl hover:bg-white/80 transition-all cursor-pointer border-l-4 border-l-red-500 h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Gmail</h3>
              <p className="text-xs text-muted-foreground">Mailbox</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-600">{gmailLoading ? "..." : gmailMessages.length}</span>
            <span className="text-sm text-muted-foreground">
              {gmailMessages.filter((m) => m.isUnread).length > 0 && (
                <span className="text-red-600 font-medium">({gmailMessages.filter((m) => m.isUnread).length} unread)</span>
              )}
            </span>
          </div>
        </div>
      </Link>

      {/* Slack Card */}
      <Link href="/connect" data-testid="card-slack">
        <div className="glass-panel p-5 rounded-xl hover:bg-white/80 transition-all cursor-pointer border-l-4 border-l-purple-500 h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Slack</h3>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-600">{slackLoading ? "..." : slackMessages.length}</span>
            <span className="text-sm text-muted-foreground">
              {slackMessages.filter((m) => m.isDm).length > 0 && (
                <span className="text-pink-600 font-medium">({slackMessages.filter((m) => m.isDm).length} DMs)</span>
              )}
            </span>
          </div>
        </div>
      </Link>

      {/* Zoom Card */}
      <Link href="/connect" data-testid="card-zoom">
        <div className="glass-panel p-5 rounded-xl hover:bg-white/80 transition-all cursor-pointer border-l-4 border-l-blue-500 h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Zoom</h3>
              <p className="text-xs text-muted-foreground">Meetings</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">{zoomLoading ? "..." : zoomMeetings.length}</span>
            <span className="text-sm text-muted-foreground">scheduled</span>
          </div>
        </div>
      </Link>

      {/* Intro Offers Card */}
      <Link href="/intro-offers" data-testid="card-intro-offers">
        <div className="glass-panel p-5 rounded-xl hover:bg-white/80 transition-all cursor-pointer border-l-4 border-l-amber-500 h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Gift className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Intro Offer Funnel</h3>
              <p className="text-xs text-muted-foreground">New Students</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600">{introOffers.length}</span>
            <span className="text-sm text-muted-foreground">
              {introOffers.filter((o) => o.memberStatus === "new" || o.memberStatus === "at_risk").length > 0 && (
                <span className="text-amber-600 font-medium">
                  ({introOffers.filter((o) => o.memberStatus === "new" || o.memberStatus === "at_risk").length} need
                  attention)
                </span>
              )}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
