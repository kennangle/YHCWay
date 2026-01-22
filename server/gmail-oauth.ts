// Custom Gmail OAuth implementation with proper email read scopes
import { google } from 'googleapis';
import crypto from 'crypto';
import { storage } from './storage';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

// OAuth state signing for CSRF protection
const getStateSecret = () => process.env.SESSION_SECRET || process.env.REPL_ID || 'default-gmail-oauth-secret';

export function signOAuthState(data: { userId: string; label?: string }): string {
  const payload = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', getStateSecret());
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

export function verifyOAuthState(state: string): { userId: string; label?: string } | null {
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

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  // Use environment-specific redirect URI
  // Priority: APP_URL > REPLIT_DEV_DOMAIN > REPL_SLUG fallback
  let redirectUri: string;
  
  if (process.env.APP_URL) {
    // Use custom domain if configured (production)
    redirectUri = `${process.env.APP_URL}/api/gmail/callback`;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    // Development environment
    redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/gmail/callback`;
  } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    // Fallback for Replit deployment
    redirectUri = `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER.toLowerCase()}.replit.app/api/gmail/callback`;
  } else {
    redirectUri = 'http://localhost:5000/api/gmail/callback';
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

export async function handleGmailCallback(code: string, userId: string, label?: string): Promise<{ email: string; isNew: boolean }> {
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
  
  // Check if this account already exists for this user
  const existingAccount = await storage.getOAuthAccountByProvider('gmail', gmailEmail);
  const isNew = !existingAccount || existingAccount.userId !== userId;
  
  // Check if user has reached the 10-account limit
  if (isNew) {
    const count = await storage.countOAuthAccounts(userId, 'gmail');
    if (count >= 10) {
      throw new Error('Maximum of 10 Gmail accounts allowed');
    }
  }
  
  // Check if this is the first account (make it primary)
  const currentCount = await storage.countOAuthAccounts(userId, 'gmail');
  const isPrimary = currentCount === 0;
  
  // Store/update tokens in oauth_accounts table using providerAccountId to identify
  await storage.upsertOAuthAccountByProviderAccountId({
    userId,
    provider: 'gmail',
    providerAccountId: gmailEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    label: label || gmailEmail.split('@')[0],
    isPrimary,
  });
  
  return { email: gmailEmail, isNew };
}

export async function getGmailClientForUser(userId: string, accountId?: number) {
  console.log("[Gmail OAuth] Getting client for user:", userId, "accountId:", accountId);
  
  let account;
  if (accountId) {
    account = await storage.getOAuthAccountById(accountId);
    if (account && account.userId !== userId) {
      throw new Error('Unauthorized access to Gmail account');
    }
  } else {
    account = await storage.getOAuthAccount(userId, 'gmail');
  }
  
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
      
      // Update stored tokens using providerAccountId
      await storage.upsertOAuthAccountByProviderAccountId({
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

export async function getGmailClientsForUser(userId: string): Promise<Array<{ accountId: number; email: string; label: string | null; isPrimary: boolean | null; client: ReturnType<typeof google.gmail> }>> {
  const accounts = await storage.listOAuthAccounts(userId, 'gmail');
  
  if (accounts.length === 0) {
    throw new Error('No Gmail accounts connected');
  }
  
  const clients = [];
  
  for (const account of accounts) {
    if (!account.accessToken) continue;
    
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
        
        await storage.upsertOAuthAccountByProviderAccountId({
          userId,
          provider: 'gmail',
          providerAccountId: account.providerAccountId,
          accessToken: credentials.access_token || account.accessToken,
          refreshToken: credentials.refresh_token || account.refreshToken,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : account.expiresAt,
        });
        
        oauth2Client.setCredentials(credentials);
      } catch (error) {
        console.error(`Failed to refresh Gmail token for ${account.providerAccountId}:`, error);
        continue;
      }
    }
    
    clients.push({
      accountId: account.id,
      email: account.providerAccountId,
      label: account.label,
      isPrimary: account.isPrimary,
      client: google.gmail({ version: 'v1', auth: oauth2Client }),
    });
  }
  
  return clients;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  accountId?: number;
  accountEmail?: string;
  accountLabel?: string | null;
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

export async function getRecentEmailsFromAllAccounts(userId: string, maxResults: number = 20): Promise<EmailMessage[]> {
  const clients = await getGmailClientsForUser(userId);
  
  if (clients.length === 0) {
    return [];
  }
  
  const allEmails: EmailMessage[] = [];
  const perAccountLimit = Math.ceil(maxResults / clients.length);
  
  for (const { accountId, email: accountEmail, label: accountLabel, client: gmail } of clients) {
    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: perAccountLimit,
        labelIds: ['INBOX'],
      });

      if (!response.data.messages) continue;

      for (const msg of response.data.messages.slice(0, perAccountLimit)) {
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

        allEmails.push({
          id: msg.id!,
          threadId: msg.threadId!,
          subject,
          from,
          snippet: detail.data.snippet || '',
          date,
          isUnread,
          accountId,
          accountEmail,
          accountLabel,
        });
      }
    } catch (error) {
      console.error(`Error fetching emails from ${accountEmail}:`, error);
    }
  }
  
  // Sort by date descending and limit
  allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return allEmails.slice(0, maxResults);
}

export async function getRecentEmailsForAccount(userId: string, accountId: number, maxResults: number = 20): Promise<EmailMessage[]> {
  const account = await storage.getOAuthAccountById(accountId);
  if (!account || account.userId !== userId || account.provider !== 'gmail') {
    throw new Error('Gmail account not found');
  }
  
  const gmail = await getGmailClientForUser(userId, accountId);
  
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
      accountId,
      accountEmail: account.providerAccountId,
      accountLabel: account.label,
    });
  }

  return emails;
}

export async function getSentEmailsForUser(userId: string, maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getGmailClientForUser(userId);
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['SENT'],
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
      metadataHeaders: ['Subject', 'From', 'To', 'Date'],
    });

    const headers = detail.data.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
    const to = headers.find(h => h.name === 'To')?.value || 'Unknown';
    const date = headers.find(h => h.name === 'Date')?.value || '';

    emails.push({
      id: msg.id!,
      threadId: msg.threadId!,
      subject,
      from: `To: ${to}`,
      snippet: detail.data.snippet || '',
      date,
      isUnread: false,
    });
  }

  return emails;
}

export async function getArchivedEmailsForUser(userId: string, maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getGmailClientForUser(userId);
  
  // Archived emails: have "All Mail" label but NOT "INBOX", "TRASH", or "SPAM"
  // Use query to exclude inbox, trash, and spam
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: '-in:inbox -in:trash -in:spam -in:drafts',
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

export async function getTrashedEmailsForUser(userId: string, maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getGmailClientForUser(userId);
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['TRASH'],
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

export async function emptyTrashForUser(userId: string): Promise<{ deletedCount: number }> {
  const gmail = await getGmailClientForUser(userId);
  
  let deletedCount = 0;
  let pageToken: string | undefined = undefined;
  
  // Paginate through all trash messages
  do {
    const response: { data: { messages?: Array<{ id?: string | null }>; nextPageToken?: string | null } } = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['TRASH'],
      maxResults: 500,
      pageToken,
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      break;
    }

    const messageIds: string[] = response.data.messages.map((m: { id?: string | null }) => m.id!);
    
    // Permanently delete messages in batches
    const batchSize = 50;
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map((id: string) =>
          gmail.users.messages.delete({
            userId: 'me',
            id,
          }).catch(() => null)
        )
      );
    }
    
    deletedCount += messageIds.length;
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return { deletedCount };
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

export async function sendEmail(userId: string, to: string, subject: string, body: string, inReplyTo?: string, threadId?: string, accountId?: number): Promise<void> {
  const gmail = await getGmailClientForUser(userId, accountId);
  
  // Get user's email for the From header
  let fromEmail = 'me';
  if (accountId) {
    const account = await storage.getOAuthAccountById(accountId);
    fromEmail = account?.providerAccountId || 'me';
  } else {
    const account = await storage.getOAuthAccount(userId, 'gmail');
    fromEmail = account?.providerAccountId || 'me';
  }
  
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

export async function archiveEmailById(userId: string, messageId: string): Promise<boolean> {
  const gmail = await getGmailClientForUser(userId);
  
  // Archive = remove INBOX label
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
  });
  
  return true;
}
