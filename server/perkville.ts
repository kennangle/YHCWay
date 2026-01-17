import { storage } from "./storage";

const PERKVILLE_TOKEN_URL = "https://www.perkville.com/api/token/";
const PERKVILLE_API_BASE = "https://api.perkville.com/v2";

function getPerkvilleClientId(): string | undefined {
  return process.env.PERKVILLE_CLIENT_ID?.trim().replace(/\\n/g, '').replace(/[\r\n\-]+$/, '');
}

function getPerkvilleClientSecret(): string | undefined {
  return process.env.PERKVILLE_CLIENT_SECRET?.trim().replace(/\\n/g, '').replace(/[\r\n\-]+$/, '');
}

function getPerkvilleBusinessId(): number {
  return process.env.PERKVILLE_BUSINESS_ID ? parseInt(process.env.PERKVILLE_BUSINESS_ID) : 7128;
}

export function isPerkvilleConfigured(): boolean {
  const clientId = getPerkvilleClientId();
  const clientSecret = getPerkvilleClientSecret();
  console.log("[Perkville] Config check - Client ID exists:", !!clientId, "Secret exists:", !!clientSecret);
  return !!(clientId && clientSecret);
}

export async function authenticateWithPerkville(username: string, password: string): Promise<{
  access_token: string;
  token_type: string;
  scope?: string;
}> {
  const clientId = getPerkvilleClientId();
  const clientSecret = getPerkvilleClientSecret();
  
  if (!clientId || !clientSecret) {
    console.error("[Perkville] Missing credentials - Client ID:", !!clientId, "Secret:", !!clientSecret);
    throw new Error("Perkville client credentials not configured");
  }

  console.log("[Perkville] Using Client ID:", clientId);
  console.log("[Perkville] Client Secret length:", clientSecret.length);
  console.log("[Perkville] Authenticating user:", username);
  
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  
  const bodyParams = new URLSearchParams({
    grant_type: "password",
    username: username,
    password: password,
    client_id: clientId,
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
    console.error("[Perkville] Authentication failed - Status:", response.status);
    console.error("[Perkville] Response:", errorText);
    
    let errorMessage = "Invalid Perkville credentials";
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error_description) {
        errorMessage = errorJson.error_description;
      } else if (errorJson.error) {
        errorMessage = `Perkville error: ${errorJson.error}`;
      } else if (errorJson.detail) {
        errorMessage = errorJson.detail;
      }
    } catch {
      // Not JSON, use default message
    }
    throw new Error(errorMessage);
  }

  const tokenData = await response.json();
  console.log("[Perkville] Authentication successful, scopes:", tokenData.scope);
  return tokenData;
}

export async function isUserPerkvilleConnected(userId: string): Promise<boolean> {
  const account = await storage.getOAuthAccount(userId, "perkville");
  return !!account?.accessToken;
}

export async function validatePerkvilleToken(userId: string): Promise<{ valid: boolean; error?: string }> {
  const account = await storage.getOAuthAccount(userId, "perkville");
  if (!account?.accessToken) {
    return { valid: false, error: "No token stored" };
  }

  try {
    // Use the business endpoint to validate token - this is a known working endpoint
    const response = await fetch(`${PERKVILLE_API_BASE}/businesses/${getPerkvilleBusinessId()}/`, {
      headers: {
        "Authorization": `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Only consider 401 as token expired - other errors may be API issues
      if (response.status === 401) {
        // Check if it's actually an oauth error
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error_type === "oauth_error" || errorJson.errors?.__all__?.[0]?.code === "invalid_token") {
            console.error("[Perkville] Token invalid:", errorText);
            return { valid: false, error: "Token expired or invalid" };
          }
        } catch {
          // Not JSON, still a 401
          console.error("[Perkville] Token validation failed (401):", errorText);
          return { valid: false, error: "Token expired or invalid" };
        }
      }
      // For other errors (404, 500, etc.) assume token is OK but API has issues
      console.log("[Perkville] API returned", response.status, "- assuming token is valid");
      return { valid: true };
    }

    return { valid: true };
  } catch (error: any) {
    // Network errors shouldn't invalidate the token
    console.error("[Perkville] Token validation network error:", error);
    return { valid: true };
  }
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

export function getDefaultPerkvilleBusinessId(): number {
  return getPerkvilleBusinessId();
}

export async function getPerkvilleBusinesses(userId: string): Promise<any[]> {
  try {
    // Fetch the specific business by ID instead of all businesses
    const data = await perkvilleApiRequest(userId, `/businesses/${getPerkvilleBusinessId()}/`);
    
    if (data?.id || data?.business_id) {
      return [{
        id: data.business_id || data.id,
        name: data.name || `Business ${data.business_id || data.id}`,
        slug: data.slug,
      }];
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching Perkville business:", error);
    return [];
  }
}

export async function getPerkvilleCustomers(userId: string, businessId: number): Promise<any[]> {
  try {
    // Use V2 API to get connections with status=ACTIVE
    const allConnections: any[] = [];
    let nextUrl: string | null = `/connections/?business=${businessId}&status=ACTIVE`;
    
    while (nextUrl) {
      const data = await perkvilleApiRequest(userId, nextUrl);
      const results = data.objects || data.results || [];
      allConnections.push(...results);
      nextUrl = data.next || null;
      if (allConnections.length >= 100) break; // Limit for user fetching
    }
    
    // Now fetch user details for each connection
    const accessToken = await getPerkvilleAccessToken(userId);
    if (!accessToken) throw new Error("Perkville not connected");
    
    // Fetch user details in parallel (batch of 10 at a time)
    const enrichedConnections = [];
    for (let i = 0; i < allConnections.length; i += 10) {
      const batch = allConnections.slice(i, i + 10);
      const enrichedBatch = await Promise.all(batch.map(async (conn: any) => {
        try {
          // Extract user ID from user reference like "/v2/users/3106882/"
          const userRef = conn.user || '';
          const userMatch = userRef.match(/\/users\/(\d+)/);
          if (!userMatch) return conn;
          
          const userResponse = await fetch(`https://api.perkville.com/v2/users/${userMatch[1]}/`, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            return {
              ...conn,
              first_name: userData.first_name || '',
              last_name: userData.last_name || '',
              email: userData.emails?.[0]?.email || '',
            };
          }
        } catch (e) {
          // Silently fail for individual user fetches
        }
        return conn;
      }));
      enrichedConnections.push(...enrichedBatch);
    }
    
    console.log("[Perkville] Enriched connection sample:", JSON.stringify(enrichedConnections[0] || {}).substring(0, 300));
    return enrichedConnections;
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
