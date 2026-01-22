import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

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

export function UpcomingEventsWidget() {
  const { data: calendarEvents = [], isLoading } = useQuery<CalendarEvent[]>({
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

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-4">Loading events...</div>;
  }

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const filteredEvents = calendarEvents.filter((event) => {
    const eventDate = new Date(event.start);
    return eventDate <= sevenDaysFromNow;
  });

  if (filteredEvents.length === 0) {
    return <div className="text-center text-muted-foreground py-4">No upcoming events in the next 7 days</div>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {filteredEvents.map((event) => {
        const isNow = isEventNow(event.start, event.end, event.isAllDay);
        const isCalendly = event.source === "calendly";
        return (
          <Link key={event.id} href="/calendar" data-testid={`upcoming-event-${event.id}`}>
            <div
              className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
                isCalendly
                  ? "bg-blue-50/60 border-blue-200/50 hover:bg-blue-100/80"
                  : "bg-white/60 border-white/30 hover:bg-white/80"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isNow ? "bg-primary animate-pulse" : isCalendly ? "bg-blue-500" : "bg-green-500"
                }`}
              ></div>
              {isCalendly && (
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">
                  Calendly
                </span>
              )}
              <span className="text-xs font-medium text-primary/80 flex-shrink-0">{formatEventDate(event.start)}</span>
              <span className={`text-xs font-semibold flex-shrink-0 ${isNow ? "text-primary" : "text-muted-foreground"}`}>
                {isNow ? "NOW" : formatEventStartTime(event.start, event.isAllDay)}
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
  );
}
