import { storage } from "./storage";

const PERKVILLE_CLIENT_ID = process.env.PERKVILLE_CLIENT_ID;
const PERKVILLE_CLIENT_SECRET = process.env.PERKVILLE_CLIENT_SECRET;
const PERKVILLE_TOKEN_URL = "https://www.perkville.com/api/token/";
const PERKVILLE_API_BASE = "https://api.perkville.com/v2";

export function isPerkvilleConfigured(): boolean {
  return !!(PERKVILLE_CLIENT_ID && PERKVILLE_CLIENT_SECRET);
}

export async function authenticateWithPerkville(username: string, password: string): Promise<{
  access_token: string;
  token_type: string;
  scope?: string;
}> {
  if (!PERKVILLE_CLIENT_ID || !PERKVILLE_CLIENT_SECRET) {
    throw new Error("Perkville client credentials not configured");
  }

  const credentials = Buffer.from(`${PERKVILLE_CLIENT_ID}:${PERKVILLE_CLIENT_SECRET}`).toString("base64");
  
  const response = await fetch(PERKVILLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: username,
      password: password,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Perkville] Authentication failed:", errorText);
    throw new Error("Invalid Perkville credentials");
  }

  const tokenData = await response.json();
  console.log("[Perkville] Authentication successful, scopes:", tokenData.scope);
  return tokenData;
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

  const url = endpoint.startsWith("http") ? endpoint : `${PERKVILLE_API_BASE}${endpoint}`;
  const response = await fetch(url, {
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

export async function getPerkvilleMe(userId: string): Promise<any | null> {
  try {
    const data = await perkvilleApiRequest(userId, "/me/");
    return data;
  } catch (error) {
    console.error("Error fetching Perkville me:", error);
    return null;
  }
}

export async function getPerkvilleBusinesses(userId: string): Promise<any[]> {
  try {
    const me = await getPerkvilleMe(userId);
    if (!me) return [];
    
    const staffConnections = me.staff_connections || [];
    const businesses: any[] = [];
    
    for (const conn of staffConnections) {
      if (conn.business) {
        businesses.push({
          id: conn.business.id || conn.business,
          name: conn.business.name || `Business ${conn.business}`,
          role: conn.role,
        });
      }
    }
    
    return businesses;
  } catch (error) {
    console.error("Error fetching Perkville businesses:", error);
    return [];
  }
}

export async function getPerkvilleCustomers(userId: string, businessId: number): Promise<any[]> {
  try {
    const allCustomers: any[] = [];
    let nextUrl: string | null = `/connections/?business=${businessId}`;
    
    while (nextUrl) {
      const data = await perkvilleApiRequest(userId, nextUrl);
      const results = data.results || [];
      allCustomers.push(...results);
      nextUrl = data.next || null;
      
      if (allCustomers.length >= 500) break;
    }
    
    return allCustomers;
  } catch (error) {
    console.error("Error fetching Perkville customers:", error);
    return [];
  }
}

export async function getPerkvilleConnectionBalances(userId: string, businessId: number): Promise<any[]> {
  try {
    const allBalances: any[] = [];
    let nextUrl: string | null = `/connection-balances/?business=${businessId}`;
    
    while (nextUrl) {
      const data = await perkvilleApiRequest(userId, nextUrl);
      const results = data.results || [];
      allBalances.push(...results);
      nextUrl = data.next || null;
      
      if (allBalances.length >= 500) break;
    }
    
    return allBalances;
  } catch (error) {
    console.error("Error fetching Perkville connection balances:", error);
    return [];
  }
}

export async function searchPerkvilleCustomerByEmail(userId: string, email: string): Promise<any | null> {
  try {
    const data = await perkvilleApiRequest(userId, `/connections/?user__emails__email=${encodeURIComponent(email)}`);
    const results = data.results || [];
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("Error searching Perkville customer:", error);
    return null;
  }
}

export async function getPerkvilleCustomerById(userId: string, connectionId: number): Promise<any | null> {
  try {
    const data = await perkvilleApiRequest(userId, `/connections/${connectionId}/`);
    return data;
  } catch (error) {
    console.error("Error fetching Perkville customer by ID:", error);
    return null;
  }
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
