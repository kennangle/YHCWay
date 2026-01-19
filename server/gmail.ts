// Gmail integration using Replit's Gmail connector
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

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

export async function getRecentEmails(maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getGmailClient();
  
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

export async function getSentEmails(maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getGmailClient();
  
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

export async function getArchivedEmails(maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getGmailClient();
  
  // Archived emails: have "All Mail" label but NOT "INBOX", "TRASH", or "SPAM"
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

export async function getTrashedEmails(maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getGmailClient();
  
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

export async function isGmailConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export interface EmailDetail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  replyTo?: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  body: string;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function extractEmailBody(payload: any): string {
  if (!payload) return '';
  
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  
  if (payload.parts) {
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      return decodeBase64Url(htmlPart.body.data);
    }
    
    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }
    
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

export async function getEmailByIdViaConnector(messageId: string): Promise<EmailDetail> {
  const gmail = await getGmailClient();
  
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

export async function deleteEmail(messageId: string): Promise<boolean> {
  const gmail = await getGmailClient();
  
  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
  
  return true;
}

export async function archiveEmail(messageId: string): Promise<boolean> {
  const gmail = await getGmailClient();
  
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

export async function sendEmailViaConnector(to: string, subject: string, body: string, threadId?: string): Promise<void> {
  const gmail = await getGmailClient();
  
  // Build email message
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body
  ];
  
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
