// Google Sheets Integration (via Replit Connector)
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheets not connected');
  }
  return accessToken;
}

async function getOAuth2Client() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

export async function getGoogleSheetsClient() {
  const oauth2Client = await getOAuth2Client();
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

export async function getGoogleDriveClientForSheets() {
  const oauth2Client = await getOAuth2Client();
  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function isGoogleSheetsConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export interface GoogleSheet {
  id: string;
  name: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
}

export async function listGoogleSheets(pageSize: number = 20): Promise<GoogleSheet[]> {
  const drive = await getGoogleDriveClientForSheets();
  
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    pageSize,
    orderBy: 'modifiedTime desc',
    fields: 'files(id, name, modifiedTime, createdTime, webViewLink)'
  });

  return (response.data.files || []).map(file => ({
    id: file.id!,
    name: file.name!,
    modifiedTime: file.modifiedTime!,
    createdTime: file.createdTime!,
    webViewLink: file.webViewLink!
  }));
}

export async function createGoogleSheet(title: string): Promise<GoogleSheet> {
  const sheets = await getGoogleSheetsClient();
  const drive = await getGoogleDriveClientForSheets();
  
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title }
    }
  });

  const sheetId = response.data.spreadsheetId!;
  
  const fileResponse = await drive.files.get({
    fileId: sheetId,
    fields: 'id, name, modifiedTime, createdTime, webViewLink'
  });

  return {
    id: fileResponse.data.id!,
    name: fileResponse.data.name!,
    modifiedTime: fileResponse.data.modifiedTime!,
    createdTime: fileResponse.data.createdTime!,
    webViewLink: fileResponse.data.webViewLink!
  };
}

export interface GoogleSheetContent {
  id: string;
  title: string;
  sheets: { title: string; index: number }[];
  data: string[][];
  webViewLink: string;
}

export async function getGoogleSheetContent(spreadsheetId: string, sheetName?: string): Promise<GoogleSheetContent> {
  const sheets = await getGoogleSheetsClient();
  const drive = await getGoogleDriveClientForSheets();
  
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

export async function updateGoogleSheet(
  spreadsheetId: string, 
  data: string[][], 
  sheetName?: string
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  
  const metaResponse = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = sheetName || metaResponse.data.sheets?.[0]?.properties?.title || 'Sheet1';

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: targetSheet
  });

  if (data.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${targetSheet}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: data }
    });
  }
}

export async function appendToGoogleSheet(
  spreadsheetId: string, 
  data: string[][], 
  sheetName?: string
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  
  const metaResponse = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = sheetName || metaResponse.data.sheets?.[0]?.properties?.title || 'Sheet1';

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: targetSheet,
    valueInputOption: 'RAW',
    requestBody: { values: data }
  });
}

export async function deleteGoogleSheet(spreadsheetId: string): Promise<void> {
  const drive = await getGoogleDriveClientForSheets();
  await drive.files.delete({ fileId: spreadsheetId });
}
