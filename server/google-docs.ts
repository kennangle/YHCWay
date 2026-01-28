// Google Docs Integration (via Replit Connector)
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-docs',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Docs not connected');
  }
  return accessToken;
}

async function getOAuth2Client() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

export async function getGoogleDocsClient() {
  const oauth2Client = await getOAuth2Client();
  return google.docs({ version: 'v1', auth: oauth2Client });
}

export async function getGoogleDriveClientForDocs() {
  const oauth2Client = await getOAuth2Client();
  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function isGoogleDocsConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export interface GoogleDoc {
  id: string;
  name: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
  ownerName?: string;
}

export async function listGoogleDocs(pageSize: number = 20): Promise<GoogleDoc[]> {
  const drive = await getGoogleDriveClientForDocs();
  
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.document' and trashed=false",
    pageSize,
    orderBy: 'modifiedTime desc',
    fields: 'files(id, name, modifiedTime, createdTime, webViewLink, owners)'
  });

  return (response.data.files || []).map(file => ({
    id: file.id!,
    name: file.name!,
    modifiedTime: file.modifiedTime!,
    createdTime: file.createdTime!,
    webViewLink: file.webViewLink!,
    ownerName: file.owners?.[0]?.displayName || file.owners?.[0]?.emailAddress || undefined
  }));
}

export async function createGoogleDoc(title: string): Promise<GoogleDoc> {
  const docs = await getGoogleDocsClient();
  
  const response = await docs.documents.create({
    requestBody: { title }
  });

  const docId = response.data.documentId!;
  const now = new Date().toISOString();
  
  // Return document info directly from the Docs API response
  // This avoids the need for a separate Drive API call which may fail due to scopes
  return {
    id: docId,
    name: response.data.title || title,
    modifiedTime: now,
    createdTime: now,
    webViewLink: `https://docs.google.com/document/d/${docId}/edit`
  };
}

export interface GoogleDocContent {
  id: string;
  title: string;
  content: string;
  webViewLink: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function getGoogleDocContent(documentId: string): Promise<GoogleDocContent> {
  const docs = await getGoogleDocsClient();
  
  const docResponse = await docs.documents.get({ documentId });
  
  const webViewLink = `https://docs.google.com/document/d/${documentId}/edit`;

  let htmlContent = '';
  const body = docResponse.data.body;
  
  if (body?.content) {
    for (const element of body.content) {
      if (element.paragraph) {
        const paragraph = element.paragraph;
        let paragraphHtml = '';
        
        if (paragraph.elements) {
          for (const textElement of paragraph.elements) {
            if (textElement.textRun) {
              let text = textElement.textRun.content || '';
              
              if (text === '\n') {
                continue;
              }
              
              text = escapeHtml(text.replace(/\n$/, ''));
              
              const style = textElement.textRun.textStyle;
              if (style) {
                if (style.bold) text = `<strong>${text}</strong>`;
                if (style.italic) text = `<em>${text}</em>`;
                if (style.underline) text = `<u>${text}</u>`;
                if (style.strikethrough) text = `<s>${text}</s>`;
              }
              
              paragraphHtml += text;
            }
          }
        }
        
        if (paragraphHtml.trim()) {
          const namedStyle = paragraph.paragraphStyle?.namedStyleType;
          if (namedStyle === 'HEADING_1') {
            htmlContent += `<h1>${paragraphHtml}</h1>`;
          } else if (namedStyle === 'HEADING_2') {
            htmlContent += `<h2>${paragraphHtml}</h2>`;
          } else if (namedStyle === 'HEADING_3') {
            htmlContent += `<h3>${paragraphHtml}</h3>`;
          } else {
            htmlContent += `<p>${paragraphHtml}</p>`;
          }
        } else {
          htmlContent += '<p><br></p>';
        }
      }
    }
  }

  return {
    id: documentId,
    title: docResponse.data.title || 'Untitled',
    content: htmlContent || '<p></p>',
    webViewLink
  };
}

export async function updateGoogleDoc(documentId: string, newContent: string): Promise<void> {
  if (newContent === undefined || newContent === null) {
    throw new Error('Content is required');
  }
  
  const docs = await getGoogleDocsClient();
  
  const docResponse = await docs.documents.get({ documentId });
  const body = docResponse.data.body;
  
  let endIndex = 1;
  if (body?.content) {
    const lastElement = body.content[body.content.length - 1];
    if (lastElement?.endIndex) {
      endIndex = lastElement.endIndex - 1;
    }
  }

  const requests: any[] = [];
  
  if (endIndex > 1) {
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: endIndex
        }
      }
    });
  }
  
  if (newContent) {
    requests.push({
      insertText: {
        location: { index: 1 },
        text: newContent
      }
    });
  }

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
  }
}

export async function deleteGoogleDoc(documentId: string): Promise<void> {
  const drive = await getGoogleDriveClientForDocs();
  await drive.files.delete({ fileId: documentId });
}
