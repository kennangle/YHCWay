// Zoom integration using Server-to-Server OAuth

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=account_credentials&account_id=${accountId}`
  });

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Failed to get Zoom access token');
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000
  };

  return cachedToken.token;
}

export interface ZoomMeeting {
  id: number;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
  type: number;
}

export async function getUpcomingMeetings(maxResults: number = 10): Promise<ZoomMeeting[]> {
  const token = await getAccessToken();

  const response = await fetch('https://api.zoom.us/v2/users/me/meetings?type=upcoming', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!data.meetings) {
    return [];
  }

  return data.meetings.slice(0, maxResults).map((meeting: any) => ({
    id: meeting.id,
    topic: meeting.topic,
    startTime: meeting.start_time || '',
    duration: meeting.duration || 0,
    joinUrl: meeting.join_url || '',
    type: meeting.type
  }));
}

export async function isZoomConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
