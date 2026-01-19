// Zoom OAuth integration for meeting management
import crypto from 'crypto';
import { storage } from './storage';

const ZOOM_SCOPES = [
  'meeting:read',
  'meeting:write',
  'user:read',
];

const getStateSecret = () => process.env.SESSION_SECRET || process.env.REPL_ID || 'default-zoom-oauth-secret';

export function signOAuthState(data: { userId: string }): string {
  const payload = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', getStateSecret());
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

export function verifyOAuthState(state: string): { userId: string } | null {
  try {
    const [payloadB64, signature] = state.split('.');
    if (!payloadB64 || !signature) return null;
    
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const hmac = crypto.createHmac('sha256', getStateSecret());
    hmac.update(payload);
    const expectedSignature = hmac.digest('base64url');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function getRedirectUri(): string {
  if (process.env.APP_URL) {
    return `${process.env.APP_URL}/api/zoom/callback`;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/zoom/callback`;
  } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER.toLowerCase()}.replit.app/api/zoom/callback`;
  } else {
    return 'http://localhost:5000/api/zoom/callback';
  }
}

export function getZoomAuthUrl(state: string): string {
  const clientId = process.env.ZOOM_CLIENT_ID;
  if (!clientId) {
    throw new Error('Zoom OAuth credentials not configured');
  }
  
  const redirectUri = encodeURIComponent(getRedirectUri());
  const scope = encodeURIComponent(ZOOM_SCOPES.join(' '));
  
  console.log('[Zoom OAuth] Using redirect URI:', getRedirectUri());
  
  return `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
}

export async function handleZoomCallback(code: string, userId: string): Promise<{ email: string; isNew: boolean }> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Zoom OAuth credentials not configured');
  }
  
  const redirectUri = getRedirectUri();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const tokenResponse = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  
  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('[Zoom OAuth] Token exchange failed:', errorData);
    throw new Error('Failed to exchange code for token');
  }
  
  const tokens = await tokenResponse.json();
  
  if (!tokens.access_token) {
    throw new Error('Failed to get access token');
  }
  
  const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
    },
  });
  
  if (!userResponse.ok) {
    throw new Error('Failed to get Zoom user info');
  }
  
  const userInfo = await userResponse.json();
  const zoomEmail = userInfo.email || userId;
  
  const existingAccount = await storage.getOAuthAccountByProvider('zoom', zoomEmail);
  const isNew = !existingAccount || existingAccount.userId !== userId;
  
  const expiresAt = tokens.expires_in 
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;
  
  await storage.upsertOAuthAccountByProviderAccountId({
    userId,
    provider: 'zoom',
    providerAccountId: zoomEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt,
    label: userInfo.first_name ? `${userInfo.first_name} ${userInfo.last_name || ''}`.trim() : zoomEmail.split('@')[0],
    isPrimary: true,
  });
  
  return { email: zoomEmail, isNew };
}

async function refreshZoomToken(account: any): Promise<string> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Zoom OAuth credentials not configured');
  }
  
  if (!account.refreshToken) {
    throw new Error('No refresh token available, please reconnect Zoom');
  }
  
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const tokenResponse = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refreshToken,
    }),
  });
  
  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('[Zoom OAuth] Token refresh failed:', errorData);
    throw new Error('Failed to refresh Zoom token, please reconnect');
  }
  
  const tokens = await tokenResponse.json();
  
  const expiresAt = tokens.expires_in 
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;
  
  await storage.upsertOAuthAccountByProviderAccountId({
    userId: account.userId,
    provider: 'zoom',
    providerAccountId: account.providerAccountId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || account.refreshToken,
    expiresAt,
  });
  
  return tokens.access_token;
}

async function getValidAccessToken(userId: string): Promise<string> {
  const account = await storage.getOAuthAccount(userId, 'zoom');
  
  if (!account || !account.accessToken) {
    throw new Error('Zoom not connected');
  }
  
  if (account.expiresAt && new Date(account.expiresAt).getTime() < Date.now() - 60000) {
    console.log('[Zoom] Token expired, refreshing...');
    return await refreshZoomToken(account);
  }
  
  return account.accessToken;
}

export async function isZoomConnectedForUser(userId: string): Promise<boolean> {
  const account = await storage.getOAuthAccount(userId, 'zoom');
  return !!account?.accessToken;
}

export async function disconnectZoomForUser(userId: string): Promise<void> {
  await storage.deleteOAuthAccount(userId, 'zoom');
}

export interface ZoomMeeting {
  id: number;
  uuid: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  join_url: string;
  start_url?: string;
  agenda?: string;
}

export async function listZoomMeetings(userId: string): Promise<ZoomMeeting[]> {
  const accessToken = await getValidAccessToken(userId);
  
  const response = await fetch('https://api.zoom.us/v2/users/me/meetings?type=upcoming&page_size=30', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    console.error('[Zoom] Failed to list meetings:', errorData);
    throw new Error('Failed to fetch Zoom meetings');
  }
  
  const data = await response.json();
  return data.meetings || [];
}

export async function getZoomMeeting(userId: string, meetingId: string): Promise<ZoomMeeting> {
  const accessToken = await getValidAccessToken(userId);
  
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch meeting details');
  }
  
  return await response.json();
}

export interface CreateMeetingParams {
  topic: string;
  start_time?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
  type?: number;
}

export async function createZoomMeeting(userId: string, params: CreateMeetingParams): Promise<ZoomMeeting> {
  const accessToken = await getValidAccessToken(userId);
  
  const meetingData = {
    topic: params.topic,
    type: params.type || 2,
    start_time: params.start_time,
    duration: params.duration || 60,
    timezone: params.timezone || 'America/Los_Angeles',
    agenda: params.agenda,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      waiting_room: true,
    },
  };
  
  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingData),
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    console.error('[Zoom] Failed to create meeting:', errorData);
    throw new Error('Failed to create Zoom meeting');
  }
  
  return await response.json();
}

export async function deleteZoomMeeting(userId: string, meetingId: string): Promise<void> {
  const accessToken = await getValidAccessToken(userId);
  
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok && response.status !== 204) {
    throw new Error('Failed to delete meeting');
  }
}

export async function getZoomStatus(userId: string): Promise<{
  connected: boolean;
  email?: string;
  label?: string;
  needsReconnect: boolean;
}> {
  const account = await storage.getOAuthAccount(userId, 'zoom');
  
  if (!account) {
    return { connected: false, needsReconnect: false };
  }
  
  const isExpired = account.expiresAt ? new Date(account.expiresAt).getTime() < Date.now() : false;
  const hasRefreshToken = !!account.refreshToken;
  const needsReconnect = isExpired && !hasRefreshToken;
  
  return {
    connected: true,
    email: account.providerAccountId,
    label: account.label || undefined,
    needsReconnect,
  };
}
