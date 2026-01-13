// Google Drive Integration (via Replit Connector)
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

export async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function getGoogleDocsClientViaDrive() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.docs({ version: 'v1', auth: oauth2Client });
}

export async function getGoogleSheetsClientViaDrive() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
  iconLink?: string;
  size?: string;
  parents?: string[];
}

export async function listDriveFiles(
  pageSize: number = 50,
  folderId?: string,
  mimeType?: string,
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const drive = await getGoogleDriveClient();
  
  let query = "trashed=false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }
  if (mimeType) {
    query += ` and mimeType='${mimeType}'`;
  }

  const response = await drive.files.list({
    q: query,
    pageSize,
    pageToken,
    orderBy: 'modifiedTime desc',
    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, createdTime, webViewLink, iconLink, size, parents)'
  });

  return {
    files: (response.data.files || []).map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      modifiedTime: file.modifiedTime!,
      createdTime: file.createdTime || file.modifiedTime!,
      webViewLink: file.webViewLink!,
      iconLink: file.iconLink || undefined,
      size: file.size || undefined,
      parents: file.parents as string[] | undefined
    })),
    nextPageToken: response.data.nextPageToken || undefined
  };
}

export async function listGoogleDocsViaDrive(pageSize: number = 50): Promise<DriveFile[]> {
  const result = await listDriveFiles(pageSize, undefined, 'application/vnd.google-apps.document');
  return result.files;
}

export async function listGoogleSheetsViaDrive(pageSize: number = 50): Promise<DriveFile[]> {
  const result = await listDriveFiles(pageSize, undefined, 'application/vnd.google-apps.spreadsheet');
  return result.files;
}

export async function getDocContentViaDrive(documentId: string): Promise<{
  id: string;
  title: string;
  content: string;
  webViewLink: string;
}> {
  const docs = await getGoogleDocsClientViaDrive();
  const drive = await getGoogleDriveClient();
  
  const [docResponse, fileResponse] = await Promise.all([
    docs.documents.get({ documentId }),
    drive.files.get({ fileId: documentId, fields: 'webViewLink' })
  ]);

  let textContent = '';
  const body = docResponse.data.body;
  
  if (body?.content) {
    for (const element of body.content) {
      if (element.paragraph?.elements) {
        for (const textElement of element.paragraph.elements) {
          if (textElement.textRun?.content) {
            textContent += textElement.textRun.content;
          }
        }
      }
    }
  }

  return {
    id: documentId,
    title: docResponse.data.title || 'Untitled',
    content: textContent,
    webViewLink: fileResponse.data.webViewLink!
  };
}

export async function getSheetContentViaDrive(spreadsheetId: string, sheetName?: string): Promise<{
  id: string;
  title: string;
  sheets: { title: string; index: number }[];
  data: string[][];
  webViewLink: string;
}> {
  const sheets = await getGoogleSheetsClientViaDrive();
  const drive = await getGoogleDriveClient();
  
  const [metaResponse, fileResponse] = await Promise.all([
    sheets.spreadsheets.get({ spreadsheetId }),
    drive.files.get({ fileId: spreadsheetId, fields: 'webViewLink' })
  ]);

  const sheetsList = (metaResponse.data.sheets || []).map(s => ({
    title: s.properties?.title || 'Sheet1',
    index: s.properties?.index || 0
  }));

  const targetSheet = sheetName || sheetsList[0]?.title || 'Sheet1';
  
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: targetSheet
  });

  return {
    id: spreadsheetId,
    title: metaResponse.data.properties?.title || 'Untitled',
    sheets: sheetsList,
    data: (dataResponse.data.values || []) as string[][],
    webViewLink: fileResponse.data.webViewLink!
  };
}
