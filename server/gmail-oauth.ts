// Custom Gmail OAuth implementation with proper email read scopes
import { google } from 'googleapis';
import { storage } from './storage';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  const redirectUri = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/gmail-oauth/callback`
    : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/gmail-oauth/callback`;
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGmailAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
    state,
  });
}

export async function handleGmailCallback(code: string, userId: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token) {
    throw new Error('Failed to get access token');
  }
  
  // Get user's Gmail email to use as provider account ID
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const gmailEmail = userInfo.data.email || userId;
  
  // Store tokens in oauth_accounts table
  await storage.upsertOAuthAccount({
    userId,
    provider: 'gmail',
    providerAccountId: gmailEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  });
}

export async function getGmailClientForUser(userId: string) {
  const account = await storage.getOAuthAccount(userId, 'gmail');
  
  if (!account || !account.accessToken) {
    throw new Error('Gmail not connected');
  }
  
  const oauth2Client = getOAuth2Client();
  
  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiresAt?.getTime(),
  });
  
  // Check if token needs refresh
  if (account.expiresAt && new Date(account.expiresAt).getTime() < Date.now()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      await storage.upsertOAuthAccount({
        userId,
        provider: 'gmail',
        providerAccountId: account.providerAccountId,
        accessToken: credentials.access_token || account.accessToken,
        refreshToken: credentials.refresh_token || account.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : account.expiresAt,
      });
      
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Failed to refresh Gmail token:', error);
      throw new Error('Gmail token expired, please reconnect');
    }
  }
  
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

export async function getRecentEmailsForUser(userId: string, maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getGmailClientForUser(userId);
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['INBOX'],
  });

  if (!response.data.messages) {
    return [];
  }

  const emails: EmailMessage[] = [];
  
  for (const msg of response.data.messages.slice(0, maxResults)) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date'],
    });

    const headers = detail.data.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const isUnread = detail.data.labelIds?.includes('UNREAD') || false;

    emails.push({
      id: msg.id!,
      threadId: msg.threadId!,
      subject,
      from,
      snippet: detail.data.snippet || '',
      date,
      isUnread,
    });
  }

  return emails;
}

export async function isGmailConnectedForUser(userId: string): Promise<boolean> {
  try {
    const account = await storage.getOAuthAccount(userId, 'gmail');
    return !!account?.accessToken;
  } catch {
    return false;
  }
}

export async function disconnectGmailForUser(userId: string): Promise<void> {
  await storage.deleteOAuthAccount(userId, 'gmail');
}
