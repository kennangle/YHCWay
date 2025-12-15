// Google Calendar integration using Replit's Google Calendar connector
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

export async function getCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isAllDay: boolean;
}

export async function getUpcomingEvents(maxResults: number = 10): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient();
  
  const now = new Date();
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  if (!response.data.items) {
    return [];
  }

  return response.data.items.map((event) => ({
    id: event.id || '',
    title: event.summary || '(No Title)',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    location: event.location || undefined,
    description: event.description || undefined,
    isAllDay: !event.start?.dateTime,
  }));
}

export async function getEventsForMonth(year: number, month: number): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient();
  
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
  
  // First, get all calendars the user has access to
  const calendarListResponse = await calendar.calendarList.list();
  const calendars = calendarListResponse.data.items || [];
  
  const allEvents: CalendarEvent[] = [];
  
  // Fetch events from each calendar
  for (const cal of calendars) {
    if (!cal.id) continue;
    
    try {
      const response = await calendar.events.list({
        calendarId: cal.id,
        timeMin: startOfMonth.toISOString(),
        timeMax: endOfMonth.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      if (response.data.items) {
        for (const event of response.data.items) {
          allEvents.push({
            id: event.id || '',
            title: event.summary || '(No Title)',
            start: event.start?.dateTime || event.start?.date || '',
            end: event.end?.dateTime || event.end?.date || '',
            location: event.location || undefined,
            description: event.description || undefined,
            isAllDay: !event.start?.dateTime,
          });
        }
      }
    } catch (error) {
      // Skip calendars that fail (e.g., no access)
      console.log(`Skipping calendar ${cal.id}:`, error);
    }
  }
  
  // Sort by start time
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  
  return allEvents;
}

export async function isCalendarConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
