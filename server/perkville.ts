import { storage } from "./storage";

const PERKVILLE_CLIENT_ID = process.env.PERKVILLE_CLIENT_ID?.trim().replace(/[\r\n\-]+$/, '');
const PERKVILLE_CLIENT_SECRET = process.env.PERKVILLE_CLIENT_SECRET?.trim().replace(/[\r\n\-]+$/, '');
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

  console.log("[Perkville] Using Client ID:", PERKVILLE_CLIENT_ID);
  console.log("[Perkville] Client Secret length:", PERKVILLE_CLIENT_SECRET?.length);
  console.log("[Perkville] Authenticating user:", username);
  
  const credentials = Buffer.from(`${PERKVILLE_CLIENT_ID}:${PERKVILLE_CLIENT_SECRET}`).toString("base64");
  
  const bodyParams = new URLSearchParams({
    grant_type: "password",
    username: username,
    password: password,
    client_id: PERKVILLE_CLIENT_ID,
  });
  
  console.log("[Perkville] Token URL:", PERKVILLE_TOKEN_URL);
  console.log("[Perkville] Request body:", bodyParams.toString().replace(/password=[^&]+/, 'password=***'));
  
  const response = await fetch(PERKVILLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: bodyParams.toString(),
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
    const data = await perkvilleApiRequest(userId, "/businesses/");
    
    let results: any[] = [];
    if (Array.isArray(data)) {
      results = data;
    } else if (data?.objects && Array.isArray(data.objects)) {
      results = data.objects;
    } else if (data?.results && Array.isArray(data.results)) {
      results = data.results;
    } else if (data?.id) {
      results = [data];
    }
    
    return results.map((biz: any) => ({
      id: biz.business_id || biz.id,
      name: biz.name || `Business ${biz.business_id || biz.id}`,
      slug: biz.slug,
    }));
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
      const results = data.objects || data.results || [];
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
      const results = data.objects || data.results || [];
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
    const results = data.objects || data.results || [];
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
    return data.objects || data.results || data || [];
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

export async function getPerkvillePoints(userId: string): Promise<{ total: number; available: number; pending: number }> {
  try {
    const data = await perkvilleApiRequest(userId, "/connections/?user=me");
    const connections = data.objects || data.results || [];
    
    let total = 0;
    let available = 0;
    let pending = 0;
    
    for (const conn of connections) {
      const balance = conn.balance || conn.points || 0;
      total += balance;
      available += conn.available_balance || balance;
      pending += conn.pending_balance || 0;
    }
    
    return { total, available, pending };
  } catch (error) {
    console.error("Error fetching Perkville points:", error);
    return { total: 0, available: 0, pending: 0 };
  }
}

export async function getPerkvilleRewards(userId: string): Promise<any[]> {
  try {
    const businesses = await getPerkvilleBusinesses(userId);
    if (businesses.length === 0) return [];
    
    const businessId = businesses[0].id;
    const data = await perkvilleApiRequest(userId, `/perks/?business=${businessId}&classification=REDEEM`);
    const results = data.objects || data.results || [];
    
    return results.map((perk: any) => ({
      id: perk.id,
      name: perk.title || perk.name,
      description: perk.description || "",
      pointsCost: perk.points || perk.point_value || 0,
    }));
  } catch (error) {
    console.error("Error fetching Perkville rewards:", error);
    return [];
  }
}

export async function getPerkvilleActivity(userId: string): Promise<any[]> {
  try {
    const data = await perkvilleApiRequest(userId, "/transactions/?user=me&limit=20");
    const results = data.objects || data.results || [];
    
    return results.map((tx: any) => ({
      id: tx.id,
      type: tx.points > 0 ? "earn" : "redeem",
      description: tx.title || tx.perk_title || "Transaction",
      points: tx.points || 0,
      date: tx.transaction_dt || tx.created_at,
    }));
  } catch (error) {
    console.error("Error fetching Perkville activity:", error);
    return [];
  }
}

export async function disconnectPerkville(userId: string): Promise<void> {
  await storage.deleteOAuthAccount(userId, "perkville");
}
