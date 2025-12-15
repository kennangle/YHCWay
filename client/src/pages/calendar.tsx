import { UnifiedSidebar } from "@/components/unified-sidebar";
import { Search, Bell, ChevronLeft, ChevronRight, Clock, MapPin, Video, Apple } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

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

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
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

      <main className="flex-1 ml-64 p-8 relative z-10">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-muted-foreground font-medium mb-1">Your Schedule</p>
            <h1 className="font-display font-bold text-3xl">Calendar</h1>
          </div>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors" data-testid="button-search">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors relative" data-testid="button-notifications">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="glass-panel p-6 rounded-2xl">
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
                  <div key={`empty-${i}`} className="h-24 p-2" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDay(day);
                  const dayMeetings = getMeetingsForDay(day);
                  const hasEvents = dayEvents.length > 0 || dayMeetings.length > 0;
                  
                  return (
                    <div 
                      key={day}
                      className={`h-24 p-2 rounded-lg border ${isToday(day) ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-white/50'} transition-colors`}
                      data-testid={`calendar-day-${day}`}
                    >
                      <div className={`text-sm font-medium ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                        {day}
                      </div>
                      {hasEvents && (
                        <div className="mt-1 space-y-0.5 overflow-hidden">
                          {dayEvents.slice(0, 2).map(event => (
                            <div 
                              key={event.id}
                              className={`text-[10px] px-1 py-0.5 rounded truncate ${
                                event.source === 'apple' 
                                  ? 'bg-gray-200 text-gray-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayMeetings.slice(0, 2 - dayEvents.length).map(meeting => (
                            <div 
                              key={meeting.id}
                              className="text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 truncate"
                            >
                              {meeting.topic}
                            </div>
                          ))}
                          {(dayEvents.length + dayMeetings.length) > 2 && (
                            <div className="text-[10px] text-muted-foreground">
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

          <div className="col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="font-display font-semibold text-lg mb-4">Upcoming Events</h3>
              
              {(calendarLoading || zoomLoading) ? (
                <div className="text-center text-muted-foreground py-4">Loading...</div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">No upcoming events</div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div 
                      key={event.id}
                      className={`p-3 rounded-xl border-l-4 ${
                        event.type === 'zoom' 
                          ? 'border-l-purple-500 bg-purple-50/50' 
                          : event.type === 'apple'
                            ? 'border-l-gray-500 bg-gray-50/50'
                            : 'border-l-blue-500 bg-blue-50/50'
                      }`}
                      data-testid={`upcoming-event-${event.id}`}
                    >
                      <div className="flex items-start gap-2">
                        {event.type === 'zoom' ? (
                          <Video className="w-4 h-4 text-purple-600 mt-0.5" />
                        ) : event.type === 'apple' ? (
                          <Apple className="w-4 h-4 text-gray-600 mt-0.5" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground truncate">{event.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.start).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatEventTime(event.start, event.end, event.isAllDay)}
                          </p>
                          {'location' in event && event.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          {'joinUrl' in event && event.joinUrl && (
                            <a 
                              href={event.joinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:underline mt-1 inline-block"
                            >
                              Join Meeting
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border-primary/10">
              <h3 className="font-display font-semibold text-lg mb-2">Quick Actions</h3>
              <p className="text-sm text-muted-foreground mb-4">Manage your calendar and meetings.</p>
              <button className="w-full py-2.5 rounded-lg bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors" data-testid="button-new-event">
                New Event
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
