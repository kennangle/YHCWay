import { createDAVClient, DAVCalendar, DAVCalendarObject } from 'tsdav';
import { db } from './storage';
import { appleCalendarCredentials } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface AppleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  allDay: boolean;
  source: 'apple';
}

function parseICalDate(dateStr: string): { date: Date; allDay: boolean } {
  if (!dateStr || dateStr.length < 8) {
    return { date: new Date(), allDay: false };
  }
  
  try {
    if (dateStr.includes('T')) {
      let cleanDate = dateStr.replace('Z', '');
      const year = parseInt(cleanDate.substring(0, 4));
      const month = parseInt(cleanDate.substring(4, 6)) - 1;
      const day = parseInt(cleanDate.substring(6, 8));
      const hour = parseInt(cleanDate.substring(9, 11)) || 0;
      const minute = parseInt(cleanDate.substring(11, 13)) || 0;
      const second = parseInt(cleanDate.substring(13, 15)) || 0;
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return { date: new Date(), allDay: false };
      }
      
      const date = dateStr.endsWith('Z') 
        ? new Date(Date.UTC(year, month, day, hour, minute, second))
        : new Date(year, month, day, hour, minute, second);
      
      if (isNaN(date.getTime())) {
        return { date: new Date(), allDay: false };
      }
      return { date, allDay: false };
    }
    
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return { date: new Date(), allDay: true };
    }
    
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) {
      return { date: new Date(), allDay: true };
    }
    return { date, allDay: true };
  } catch {
    return { date: new Date(), allDay: false };
  }
}

function extractICalValue(icsData: string, property: string): string | null {
  const regex = new RegExp(`${property}[^:]*:(.*)`, 'i');
  const match = icsData.match(regex);
  return match ? match[1].trim() : null;
}

function parseICSEvent(icsData: string, url: string): AppleCalendarEvent | null {
  try {
    const uid = extractICalValue(icsData, 'UID') || url;
    const summary = extractICalValue(icsData, 'SUMMARY');
    const dtstart = extractICalValue(icsData, 'DTSTART');
    const dtend = extractICalValue(icsData, 'DTEND');
    const description = extractICalValue(icsData, 'DESCRIPTION');
    const location = extractICalValue(icsData, 'LOCATION');

    if (!summary || !dtstart) return null;

    const startParsed = parseICalDate(dtstart);
    const endParsed = dtend ? parseICalDate(dtend) : startParsed;

    return {
      id: uid,
      title: summary,
      start: startParsed.date.toISOString(),
      end: endParsed.date.toISOString(),
      description: description || undefined,
      location: location || undefined,
      allDay: startParsed.allDay,
      source: 'apple',
    };
  } catch (error) {
    console.error('Error parsing ICS event:', error);
    return null;
  }
}

export async function getAppleCalendarCredentials(userId: string) {
  const creds = await db.select()
    .from(appleCalendarCredentials)
    .where(eq(appleCalendarCredentials.userId, userId))
    .limit(1);
  return creds[0] || null;
}

export async function saveAppleCalendarCredentials(
  userId: string,
  appleId: string,
  appPassword: string
) {
  const existing = await getAppleCalendarCredentials(userId);
  if (existing) {
    await db.update(appleCalendarCredentials)
      .set({ appleId, appPassword })
      .where(eq(appleCalendarCredentials.userId, userId));
  } else {
    await db.insert(appleCalendarCredentials)
      .values({ userId, appleId, appPassword });
  }
}

export async function deleteAppleCalendarCredentials(userId: string) {
  await db.delete(appleCalendarCredentials)
    .where(eq(appleCalendarCredentials.userId, userId));
}

export async function isAppleCalendarConnected(userId: string): Promise<boolean> {
  const creds = await getAppleCalendarCredentials(userId);
  return !!creds;
}

export async function testAppleCalendarConnection(
  appleId: string,
  appPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: appleId,
        password: appPassword,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    const calendars = await client.fetchCalendars();
    if (calendars && calendars.length > 0) {
      return { success: true };
    }
    return { success: false, error: 'No calendars found' };
  } catch (error: any) {
    console.error('Apple Calendar connection test failed:', error?.message || error);
    if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
      return { success: false, error: 'Invalid Apple ID or app-specific password' };
    }
    return { success: false, error: error?.message || 'Connection failed' };
  }
}

export async function getAppleCalendarEvents(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AppleCalendarEvent[]> {
  const creds = await getAppleCalendarCredentials(userId);
  if (!creds) {
    return [];
  }

  try {
    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: creds.appleId,
        password: creds.appPassword,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    const calendars = await client.fetchCalendars();
    const allEvents: AppleCalendarEvent[] = [];

    const start = startDate || new Date();
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    for (const calendar of calendars) {
      try {
        const calendarObjects = await client.fetchCalendarObjects({
          calendar,
          timeRange: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        });

        for (const obj of calendarObjects) {
          if (obj.data) {
            const event = parseICSEvent(obj.data, obj.url);
            if (event) {
              allEvents.push(event);
            }
          }
        }
      } catch (calError) {
        console.error(`Error fetching from calendar ${calendar.displayName}:`, calError);
      }
    }

    return allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  } catch (error: any) {
    console.error('Error fetching Apple Calendar events:', error?.message || error);
    return [];
  }
}

export async function getAppleCalendarEventsForMonth(
  userId: string,
  year: number,
  month: number
): Promise<AppleCalendarEvent[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);
  return getAppleCalendarEvents(userId, startDate, endDate);
}
