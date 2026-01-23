import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, CheckSquare, Video, Reply, Check, ChevronDown, ChevronUp, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isAllDay: boolean;
  source?: "google" | "calendly";
  joinUrl?: string;
}

interface ZoomMeeting {
  id: number;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
}

interface RelatedEmail {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  score: number;
}

interface RelatedTask {
  id: number;
  title: string;
  priority: string;
  dueDate?: string;
  score: number;
}

interface EventInsights {
  emails: RelatedEmail[];
  tasks: RelatedTask[];
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatEventStartTime(dateStr: string, isAllDay: boolean): string {
  if (isAllDay) return "All day";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatEventTime(start: string, end: string, isAllDay: boolean): string {
  if (isAllDay) return "All day";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startTime = startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endTime = endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${startTime} - ${endTime}`;
}

function isEventNow(start: string, end: string, isAllDay: boolean): boolean {
  if (isAllDay) return false;
  const now = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);
  return now >= startDate && now <= endDate;
}

function isEventSoon(start: string): boolean {
  const now = new Date();
  const startDate = new Date(start);
  const diffMs = startDate.getTime() - now.getTime();
  const diffMins = diffMs / (1000 * 60);
  return diffMins > 0 && diffMins <= 30;
}

interface EventCardProps {
  event: CalendarEvent;
  zoomMeeting?: ZoomMeeting;
}

function EventCard({ event, zoomMeeting }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<RelatedEmail | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const queryClient = useQueryClient();

  const isNow = isEventNow(event.start, event.end, event.isAllDay);
  const isSoon = isEventSoon(event.start);
  const isCalendly = event.source === "calendly";
  const joinUrl = zoomMeeting?.joinUrl || event.joinUrl;

  const { data: insights } = useQuery<EventInsights>({
    queryKey: ["/api/insights/event", event.id],
    queryFn: async () => {
      const res = await fetch(`/api/insights/event/${event.id}`, { credentials: "include" });
      if (!res.ok) return { emails: [], tasks: [] };
      return res.json();
    },
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed to complete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights/event", event.id] });
      toast.success("Task completed");
    },
    onError: () => toast.error("Failed to complete task"),
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ threadId, body: content, isReply: true }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => {
      setReplyingTo(null);
      setReplyContent("");
      toast.success("Reply sent");
    },
    onError: () => toast.error("Failed to send reply"),
  });

  const hasInsights = insights && (insights.emails.length > 0 || insights.tasks.length > 0);

  return (
    <>
      <div
        className={`rounded-lg border transition-all ${
          isCalendly
            ? "bg-blue-50/60 border-blue-200/50"
            : isNow
            ? "bg-primary/5 border-primary/30"
            : isSoon
            ? "bg-amber-50/60 border-amber-200/50"
            : "bg-white/60 border-white/30"
        }`}
        data-testid={`upcoming-event-${event.id}`}
      >
        <div
          className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/40 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isNow ? "bg-primary animate-pulse" : isSoon ? "bg-amber-500" : isCalendly ? "bg-blue-500" : "bg-green-500"
            }`}
          />
          {isCalendly && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">
              Calendly
            </span>
          )}
          <span className="text-xs font-medium text-primary/80 flex-shrink-0">{formatEventDate(event.start)}</span>
          <span className={`text-xs font-semibold flex-shrink-0 ${isNow ? "text-primary" : isSoon ? "text-amber-600" : "text-muted-foreground"}`}>
            {isNow ? "NOW" : isSoon ? "SOON" : formatEventStartTime(event.start, event.isAllDay)}
          </span>
          <span className="font-medium text-foreground text-sm truncate flex-1">{event.title}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatEventTime(event.start, event.end, event.isAllDay)}
          </span>
          
          <div className="flex items-center gap-1">
            {joinUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(joinUrl, "_blank");
                }}
                data-testid={`button-join-${event.id}`}
              >
                <Video className="w-3.5 h-3.5" />
              </Button>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-3 pt-1 border-t border-border/30">
            {!insights ? (
              <div className="text-xs text-muted-foreground py-2">Loading insights...</div>
            ) : !hasInsights ? (
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-muted-foreground">No related items found</span>
                <Link href="/calendar">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                    <ExternalLink className="w-3 h-3" />
                    View in Calendar
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {insights.emails.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Related Emails ({insights.emails.length})
                    </div>
                    <div className="space-y-1">
                      {insights.emails.slice(0, 2).map((email) => (
                        <div
                          key={email.id}
                          className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-xs">{email.subject}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{email.from}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => setReplyingTo(email)}
                            data-testid={`button-quick-reply-${email.id}`}
                          >
                            <Reply className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {insights.tasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                      <CheckSquare className="w-3.5 h-3.5" />
                      Related Tasks ({insights.tasks.length})
                    </div>
                    <div className="space-y-1">
                      {insights.tasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-xs">{task.title}</p>
                            {task.dueDate && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                Due {new Date(task.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 gap-1 text-xs"
                            onClick={() => completeTaskMutation.mutate(task.id)}
                            disabled={completeTaskMutation.isPending}
                            data-testid={`button-complete-task-${task.id}`}
                          >
                            <Check className="w-3 h-3" />
                            Done
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Link href="/calendar">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                      <ExternalLink className="w-3 h-3" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Reply</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Replying to: </span>
              <span className="font-medium">{replyingTo?.subject}</span>
            </div>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              data-testid="input-quick-reply-content"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyingTo(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => replyingTo && sendReplyMutation.mutate({ 
                  threadId: replyingTo.id, 
                  content: replyContent 
                })}
                disabled={!replyContent.trim() || sendReplyMutation.isPending}
                data-testid="button-send-quick-reply"
              >
                Send Reply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UpcomingEventsWidget() {
  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/events", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 500) return [];
        throw new Error("Failed to fetch calendar events");
      }
      return res.json();
    },
  });

  const { data: zoomMeetings = [] } = useQuery<ZoomMeeting[]>({
    queryKey: ["zoom-meetings"],
    queryFn: async () => {
      const res = await fetch("/api/zoom/meetings", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (eventsLoading) {
    return <div className="text-center text-muted-foreground py-4">Loading events...</div>;
  }

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const filteredEvents = calendarEvents.filter((event) => {
    const eventDate = new Date(event.start);
    return eventDate <= sevenDaysFromNow;
  });

  const getZoomMeetingForEvent = (event: CalendarEvent): ZoomMeeting | undefined => {
    const eventStart = new Date(event.start).getTime();
    return zoomMeetings.find((meeting) => {
      const meetingStart = new Date(meeting.startTime).getTime();
      return Math.abs(eventStart - meetingStart) < 5 * 60 * 1000;
    });
  };

  if (filteredEvents.length === 0) {
    return <div className="text-center text-muted-foreground py-4">No upcoming events in the next 7 days</div>;
  }

  return (
    <div className="space-y-2">
      {filteredEvents.map((event) => (
        <EventCard 
          key={event.id} 
          event={event} 
          zoomMeeting={getZoomMeetingForEvent(event)} 
        />
      ))}
    </div>
  );
}
