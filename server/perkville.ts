import { storage } from "./storage";

const PERKVILLE_CLIENT_ID = process.env.PERKVILLE_CLIENT_ID;
const PERKVILLE_CLIENT_SECRET = process.env.PERKVILLE_CLIENT_SECRET;
const PERKVILLE_AUTH_URL = "https://www.perkville.com/api/authorize/";
const PERKVILLE_TOKEN_URL = "https://www.perkville.com/api/token/";
const PERKVILLE_API_BASE = "https://api.perkville.com/v2";

export function isPerkvilleConfigured(): boolean {
  return !!(PERKVILLE_CLIENT_ID && PERKVILLE_CLIENT_SECRET);
}

export function getPerkvilleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: PERKVILLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    state: state,
  });
  return `${PERKVILLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangePerkvilleCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  token_type: string;
  scope?: string;
}> {
  const credentials = Buffer.from(`${PERKVILLE_CLIENT_ID}:${PERKVILLE_CLIENT_SECRET}`).toString("base64");
  
  const response = await fetch(PERKVILLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      client_id: PERKVILLE_CLIENT_ID!,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Perkville token exchange failed:", errorText);
    throw new Error("Failed to exchange Perkville authorization code");
  }

  return response.json();
}

export async function isUserPerkvilleConnected(userId: string): Promise<boolean> {
  const account = await storage.getOAuthAccount(userId, "perkville");
  return !!account?.accessToken;
}

async function getPerkvilleAccessToken(userId: string): Promise<string | null> {
  const account = await storage.getOAuthAccount(userId, "perkville");
  return account?.accessToken || null;
}

async function perkvilleApiRequest(userId: string, endpoint: string): Promise<any> {
  const accessToken = await getPerkvilleAccessToken(userId);
  if (!accessToken) {
    throw new Error("Perkville not connected");
  }

  const response = await fetch(`${PERKVILLE_API_BASE}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Perkville API error (${endpoint}):`, errorText);
    throw new Error(`Perkville API request failed: ${response.status}`);
  }

  return response.json();
}

export async function getPerkvilleConnections(userId: string): Promise<any[]> {
  try {
    const data = await perkvilleApiRequest(userId, "/connections/");
    return data.results || data || [];
  } catch (error) {
    console.error("Error fetching Perkville connections:", error);
    return [];
  }
}

export async function getPerkvilleCustomerInfo(userId: string): Promise<any | null> {
  try {
    const data = await perkvilleApiRequest(userId, "/me/");
    return data;
  } catch (error) {
    console.error("Error fetching Perkville customer info:", error);
    return null;
  }
}

export async function getPerkvillePoints(userId: string): Promise<any[]> {
  try {
    const data = await perkvilleApiRequest(userId, "/points/");
    return data.results || data || [];
  } catch (error) {
    console.error("Error fetching Perkville points:", error);
    return [];
  }
}

export async function getPerkvilleRewards(userId: string): Promise<any[]> {
  try {
    const data = await perkvilleApiRequest(userId, "/rewards/");
    return data.results || data || [];
  } catch (error) {
    console.error("Error fetching Perkville rewards:", error);
    return [];
  }
}

export async function getPerkvilleActivity(userId: string): Promise<any[]> {
  try {
    const data = await perkvilleApiRequest(userId, "/activity/");
    return data.results || data || [];
  } catch (error) {
    console.error("Error fetching Perkville activity:", error);
    return [];
  }
}

export async function disconnectPerkville(userId: string): Promise<void> {
  await storage.deleteOAuthAccount(userId, "perkville");
}
