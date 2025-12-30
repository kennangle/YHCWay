// Custom Gmail OAuth implementation with proper email read scopes
import { google } from 'googleapis';
import { storage } from './storage';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  // Use environment-specific redirect URI
  // In production: use the production domain
  // In development: use REPLIT_DEV_DOMAIN if available
  let redirectUri: string;
  
  if (process.env.NODE_ENV === 'production' || !process.env.REPLIT_DEV_DOMAIN) {
    redirectUri = 'https://sync-connect--ken196.replit.app/api/gmail/callback';
  } else {
    redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/gmail/callback`;
  }
  
  console.log('[Gmail OAuth] Using redirect URI:', redirectUri);
  
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
  console.log("[Gmail OAuth] Getting client for user:", userId);
  const account = await storage.getOAuthAccount(userId, 'gmail');
  console.log("[Gmail OAuth] Account found:", !!account, "Has access token:", !!account?.accessToken);
  
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

export interface EmailDetail extends EmailMessage {
  body: string;
  to: string;
  cc?: string;
  replyTo?: string;
}

function decodeBase64Url(data: string): string {
  // Replace URL-safe characters and decode
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function extractEmailBody(payload: any): string {
  // Check for plain text or HTML body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  
  // Check parts for multipart messages
  if (payload.parts) {
    // Prefer HTML, fall back to plain text
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      return decodeBase64Url(htmlPart.body.data);
    }
    
    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }
    
    // Check nested parts (multipart/alternative inside multipart/mixed)
    for (const part of payload.parts) {
      if (part.parts) {
        const nestedHtml = part.parts.find((p: any) => p.mimeType === 'text/html');
        if (nestedHtml?.body?.data) {
          return decodeBase64Url(nestedHtml.body.data);
        }
        const nestedText = part.parts.find((p: any) => p.mimeType === 'text/plain');
        if (nestedText?.body?.data) {
          return decodeBase64Url(nestedText.body.data);
        }
      }
    }
  }
  
  return '';
}

export async function getEmailById(userId: string, messageId: string): Promise<EmailDetail> {
  const gmail = await getGmailClientForUser(userId);
  
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  
  const headers = response.data.payload?.headers || [];
  const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
  const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
  const to = headers.find(h => h.name === 'To')?.value || '';
  const cc = headers.find(h => h.name === 'Cc')?.value || undefined;
  const date = headers.find(h => h.name === 'Date')?.value || '';
  const replyTo = headers.find(h => h.name === 'Reply-To')?.value || undefined;
  const isUnread = response.data.labelIds?.includes('UNREAD') || false;
  
  const body = extractEmailBody(response.data.payload);
  
  return {
    id: messageId,
    threadId: response.data.threadId!,
    subject,
    from,
    to,
    cc,
    replyTo,
    snippet: response.data.snippet || '',
    date,
    isUnread,
    body,
  };
}

export async function sendEmail(userId: string, to: string, subject: string, body: string, inReplyTo?: string, threadId?: string): Promise<void> {
  const gmail = await getGmailClientForUser(userId);
  
  // Get user's email for the From header
  const account = await storage.getOAuthAccount(userId, 'gmail');
  const fromEmail = account?.providerAccountId || 'me';
  
  // Build email message
  const messageParts = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
  ];
  
  if (inReplyTo) {
    messageParts.push(`In-Reply-To: ${inReplyTo}`);
    messageParts.push(`References: ${inReplyTo}`);
  }
  
  messageParts.push('', body);
  
  const rawMessage = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId: threadId,
    },
  });
}

export async function isGmailConnectedForUser(userId: string): Promise<boolean> {
  try {
    console.log("[Gmail OAuth] Checking connection for user:", userId);
    const account = await storage.getOAuthAccount(userId, 'gmail');
    const isConnected = !!account?.accessToken;
    console.log("[Gmail OAuth] Connection check result:", isConnected, "Account exists:", !!account);
    return isConnected;
  } catch (error) {
    console.error("[Gmail OAuth] Error checking connection:", error);
    return false;
  }
}

export async function disconnectGmailForUser(userId: string): Promise<void> {
  await storage.deleteOAuthAccount(userId, 'gmail');
}

export async function deleteEmailById(userId: string, messageId: string): Promise<boolean> {
  const gmail = await getGmailClientForUser(userId);
  
  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
  
  return true;
}
