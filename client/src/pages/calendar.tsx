import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { Search, Bell, ChevronLeft, ChevronRight, Clock, MapPin, Video, Apple, X } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface UserPreferences {
  googleCalendarColor: string;
  appleCalendarColor: string;
  zoomColor: string;
  theme: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isAllDay: boolean;
  source?: 'google' | 'apple';
}

interface ZoomMeeting {
  id: number;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
  type: number;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 59, g: 130, b: 246 };
}

function getContrastColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? `rgba(${r}, ${g}, ${b}, 0.9)` : `rgba(${r}, ${g}, ${b}, 0.8)`;
}

function getLightBg(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
}

function getMediumBg(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: "",
    end: "",
    description: "",
    location: "",
    isAllDay: false,
  });
  const queryClient = useQueryClient();

  const createEventMutation = useMutation({
    mutationFn: async (eventData: typeof newEvent) => {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(eventData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-month"] });
      setShowNewEventDialog(false);
      setNewEvent({ title: "", start: "", end: "", description: "", location: "", isAllDay: false });
    },
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start || !newEvent.end) return;
    createEventMutation.mutate(newEvent);
  };

  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/preferences"],
    queryFn: async () => {
      const res = await fetch("/api/preferences", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
  });

  const colors = useMemo(() => ({
    google: preferences?.googleCalendarColor || "#3b82f6",
    apple: preferences?.appleCalendarColor || "#22c55e",
    zoom: preferences?.zoomColor || "#a855f7",
  }), [preferences]);

  const { data: googleEvents = [], isLoading: googleLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-month", currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/month/${currentDate.getFullYear()}/${currentDate.getMonth()}`, { credentials: "include" });
      if (!res.ok) return [];
      const events = await res.json();
      return events.map((e: CalendarEvent) => ({ ...e, source: 'google' as const }));
    },
    retry: false,
  });

  const { data: appleEvents = [], isLoading: appleLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["apple-calendar-month", currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: async () => {
      const res = await fetch(`/api/apple-calendar/month/${currentDate.getFullYear()}/${currentDate.getMonth()}`, { credentials: "include" });
      if (!res.ok) return [];
      const events = await res.json();
      return events.map((e: any) => ({ 
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        location: e.location,
        description: e.description,
        isAllDay: e.allDay,
        source: 'apple' as const 
      }));
    },
    retry: false,
  });

  const calendarEvents = [...googleEvents, ...appleEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  const calendarLoading = googleLoading || appleLoading;

  const { data: zoomMeetings = [], isLoading: zoomLoading } = useQuery<ZoomMeeting[]>({
    queryKey: ["zoom-meetings"],
    queryFn: async () => {
      const res = await fetch("/api/zoom/meetings", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === currentDate.getMonth() && 
           today.getFullYear() === currentDate.getFullYear();
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter(event => {
      const eventDate = event.start.split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getMeetingsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return zoomMeetings.filter(meeting => {
      const meetingDate = meeting.startTime?.split('T')[0];
      return meetingDate === dateStr;
    });
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

  const formatMeetingTime = (startTime: string) => {
    if (!startTime) return "";
    try {
      const date = new Date(startTime);
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const allEvents = [
    ...calendarEvents.map(e => ({ ...e, type: e.source === 'apple' ? 'apple' as const : 'calendar' as const })),
    ...zoomMeetings.map(m => ({ 
      id: String(m.id), 
      title: m.topic, 
      start: m.startTime, 
      end: new Date(new Date(m.startTime).getTime() + m.duration * 60000).toISOString(),
      isAllDay: false,
      joinUrl: m.joinUrl,
      type: 'zoom' as const 
    }))
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const upcomingEvents = allEvents.filter(e => new Date(e.start) >= new Date()).slice(0, 10);

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

      <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col pb-20 md:pb-0">
        <TopBar />
        <div className="flex-1 p-4 md:p-8">
        <header className="flex justify-between items-end mb-6 md:mb-8">
          <div>
            <p className="text-muted-foreground font-medium mb-1 text-sm md:text-base">Your Schedule</p>
            <h1 className="font-display font-bold text-2xl md:text-3xl">Calendar</h1>
          </div>
          <div className="flex gap-2 md:gap-4">
            <button className="w-9 h-9 md:w-10 md:h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors" data-testid="button-search">
              <Search className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </button>
            <button className="w-9 h-9 md:w-10 md:h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors relative" data-testid="button-notifications">
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="glass-panel p-4 md:p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-semibold text-xl">{monthName}</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={goToPrevMonth}
                    className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center hover:bg-white transition-colors"
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={goToNextMonth}
                    className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center hover:bg-white transition-colors"
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 md:h-24 p-1 md:p-2" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDay(day);
                  const dayMeetings = getMeetingsForDay(day);
                  const hasEvents = dayEvents.length > 0 || dayMeetings.length > 0;
                  
                  return (
                    <div 
                      key={day}
                      className={`h-16 md:h-24 p-1 md:p-2 rounded-lg border ${isToday(day) ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-white/50'} transition-colors`}
                      data-testid={`calendar-day-${day}`}
                    >
                      <div className={`text-xs md:text-sm font-medium ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                        {day}
                      </div>
                      {hasEvents && (
                        <div className="mt-0.5 md:mt-1 space-y-0.5 overflow-hidden">
                          {dayEvents.slice(0, 2).map(event => (
                            <div 
                              key={event.id}
                              className="hidden md:block text-[10px] px-1 py-0.5 rounded truncate"
                              style={{
                                backgroundColor: getMediumBg(event.source === 'apple' ? colors.apple : colors.google),
                                color: event.source === 'apple' ? colors.apple : colors.google,
                              }}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayMeetings.slice(0, 2 - dayEvents.length).map(meeting => (
                            <div 
                              key={meeting.id}
                              className="hidden md:block text-[10px] px-1 py-0.5 rounded truncate"
                              style={{
                                backgroundColor: getMediumBg(colors.zoom),
                                color: colors.zoom,
                              }}
                            >
                              {meeting.topic}
                            </div>
                          ))}
                          <div 
                            className="md:hidden w-1.5 h-1.5 rounded-full mx-auto"
                            style={{ backgroundColor: colors.google }}
                          />
                          {(dayEvents.length + dayMeetings.length) > 2 && (
                            <div className="hidden md:block text-[10px] text-muted-foreground">
                              +{(dayEvents.length + dayMeetings.length) - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
            <div className="glass-panel p-4 rounded-2xl">
              <h3 className="font-display font-semibold text-sm mb-3">Upcoming Events</h3>
              
              {(calendarLoading || zoomLoading) ? (
                <div className="text-center text-muted-foreground py-4">Loading...</div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">No upcoming events</div>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 5).map((event) => {
                    const eventColor = event.type === 'zoom' 
                      ? colors.zoom 
                      : event.type === 'apple' 
                        ? colors.apple 
                        : colors.google;
                    
                    const getEventUrl = () => {
                      if (event.type === 'zoom' && 'joinUrl' in event) {
                        return event.joinUrl;
                      }
                      if (event.type === 'calendar') {
                        return `https://calendar.google.com/calendar/event?eid=${btoa(event.id + ' primary').replace(/=/g, '')}`;
                      }
                      return null;
                    };
                    const eventUrl = getEventUrl();
                    
                    const content = (
                      <>
                        <h4 className="text-xs font-medium text-foreground truncate">{event.title}</h4>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(event.start).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })} · {formatEventTime(event.start, event.end, event.isAllDay)}
                        </p>
                      </>
                    );
                    
                    return eventUrl ? (
                      <a
                        key={event.id}
                        href={eventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 rounded-lg border-l-2 hover:opacity-80 transition-opacity cursor-pointer"
                        style={{
                          borderLeftColor: eventColor,
                          backgroundColor: getLightBg(eventColor),
                        }}
                        data-testid={`upcoming-event-${event.id}`}
                      >
                        {content}
                      </a>
                    ) : (
                      <div 
                        key={event.id}
                        className="p-2 rounded-lg border-l-2"
                        style={{
                          borderLeftColor: eventColor,
                          backgroundColor: getLightBg(eventColor),
                        }}
                        data-testid={`upcoming-event-${event.id}`}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-panel p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border-primary/10">
              <button 
                onClick={() => setShowNewEventDialog(true)}
                className="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors" 
                data-testid="button-new-event"
              >
                + New Event
              </button>
            </div>
          </div>
        </div>

        <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Enter event title"
                  required
                  data-testid="input-event-title"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allDay"
                  checked={newEvent.isAllDay}
                  onCheckedChange={(checked) => setNewEvent({ ...newEvent, isAllDay: checked as boolean })}
                  data-testid="checkbox-all-day"
                />
                <Label htmlFor="allDay">All day event</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Start</Label>
                  <Input
                    id="start"
                    type={newEvent.isAllDay ? "date" : "datetime-local"}
                    value={newEvent.start}
                    onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                    required
                    data-testid="input-event-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End</Label>
                  <Input
                    id="end"
                    type={newEvent.isAllDay ? "date" : "datetime-local"}
                    value={newEvent.end}
                    onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                    required
                    data-testid="input-event-end"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Enter location"
                  data-testid="input-event-location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Enter description"
                  data-testid="input-event-description"
                />
              </div>

              {createEventMutation.error && (
                <p className="text-sm text-red-500">{(createEventMutation.error as Error).message}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewEventDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending} data-testid="button-create-event">
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </main>
    </div>
  );
}
