import { storage } from "./storage";

export interface CalendlyEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isAllDay: boolean;
  source: "calendly";
  inviteeName?: string;
  inviteeEmail?: string;
  eventTypeUri?: string;
  meetingUrl?: string;
}

interface CalendlyUser {
  uri: string;
  name: string;
  email: string;
  scheduling_url: string;
  timezone: string;
  current_organization: string;
}

interface CalendlyScheduledEvent {
  uri: string;
  name: string;
  status: "active" | "canceled";
  start_time: string;
  end_time: string;
  event_type: string;
  location?: {
    type: string;
    location?: string;
    join_url?: string;
  };
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
  created_at: string;
  updated_at: string;
}

async function getCalendlyToken(userId: string): Promise<string | null> {
  const apiKey = await storage.getIntegrationApiKey(userId, "calendly");
  return apiKey?.apiKey || null;
}

export async function isCalendlyConnected(userId: string): Promise<boolean> {
  const token = await getCalendlyToken(userId);
  return !!token;
}

export async function getCalendlyUser(userId: string): Promise<CalendlyUser | null> {
  const token = await getCalendlyToken(userId);
  if (!token) return null;

  try {
    const response = await fetch("https://api.calendly.com/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("[Calendly] Failed to get user:", response.status);
      return null;
    }

    const data = await response.json();
    return data.resource as CalendlyUser;
  } catch (error) {
    console.error("[Calendly] Error getting user:", error);
    return null;
  }
}

export async function getCalendlyEvents(
  userId: string,
  maxResults: number = 20
): Promise<CalendlyEvent[]> {
  const token = await getCalendlyToken(userId);
  if (!token) return [];

  try {
    const user = await getCalendlyUser(userId);
    if (!user) return [];

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      user: user.uri,
      status: "active",
      min_start_time: now.toISOString(),
      max_start_time: thirtyDaysFromNow.toISOString(),
      count: maxResults.toString(),
    });

    const response = await fetch(
      `https://api.calendly.com/scheduled_events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("[Calendly] Failed to get events:", response.status);
      return [];
    }

    const data = await response.json();
    const events: CalendlyScheduledEvent[] = data.collection || [];

    return events.map((event) => {
      const eventId = event.uri.split("/").pop() || event.uri;
      return {
        id: `calendly-${eventId}`,
        title: event.name || "Calendly Meeting",
        start: event.start_time,
        end: event.end_time,
        location: event.location?.location || event.location?.join_url,
        meetingUrl: event.location?.join_url,
        isAllDay: false,
        source: "calendly" as const,
        eventTypeUri: event.event_type,
      };
    });
  } catch (error) {
    console.error("[Calendly] Error getting events:", error);
    return [];
  }
}

export async function getCalendlyEventsForMonth(
  userId: string,
  year: number,
  month: number
): Promise<CalendlyEvent[]> {
  const token = await getCalendlyToken(userId);
  if (!token) return [];

  try {
    const user = await getCalendlyUser(userId);
    if (!user) return [];

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    const params = new URLSearchParams({
      user: user.uri,
      status: "active",
      min_start_time: startOfMonth.toISOString(),
      max_start_time: endOfMonth.toISOString(),
      count: "100",
    });

    const response = await fetch(
      `https://api.calendly.com/scheduled_events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("[Calendly] Failed to get monthly events:", response.status);
      return [];
    }

    const data = await response.json();
    const events: CalendlyScheduledEvent[] = data.collection || [];

    return events.map((event) => {
      const eventId = event.uri.split("/").pop() || event.uri;
      return {
        id: `calendly-${eventId}`,
        title: event.name || "Calendly Meeting",
        start: event.start_time,
        end: event.end_time,
        location: event.location?.location || event.location?.join_url,
        meetingUrl: event.location?.join_url,
        isAllDay: false,
        source: "calendly" as const,
        eventTypeUri: event.event_type,
      };
    });
  } catch (error) {
    console.error("[Calendly] Error getting monthly events:", error);
    return [];
  }
}
