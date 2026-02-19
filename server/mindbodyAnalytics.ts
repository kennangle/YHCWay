const MINDBODY_ANALYTICS_BASE_URL = process.env.MINDBODY_ANALYTICS_URL || "https://mind-body-analytics-remix.replit.app";
const API_KEY = process.env.MINDBODY_API_KEY;

interface IntroOffer {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  offerName: string;
  offerCategory: string;
  purchaseAmount: string;
  purchaseDate: string;
  classesAttendedSincePurchase: number;
  lastAttendanceDate?: string;
  daysSinceLastAttendance?: number;
  daysSincePurchase: number;
  hasConverted: boolean;
  conversionDate?: string;
  conversionType?: string;
  memberStatus: string;
  notes?: string;
}

interface IntroOfferSummary {
  totalOffers: number;
  activeOffers: number;
  convertedOffers: number;
  expiredOffers: number;
  conversionRate: number;
}

interface Student {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  joinDate?: string;
  lastVisit?: string;
  totalVisits?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

async function makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!API_KEY) {
    throw new Error("MINDBODY_API_KEY is not configured");
  }

  const url = `${MINDBODY_ANALYTICS_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mindbody Analytics API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function getIntroOffers(params: {
  status?: string;
  since?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<PaginatedResponse<IntroOffer>> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append("status", params.status);
  if (params.since) queryParams.append("since", params.since);
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.offset) queryParams.append("offset", params.offset.toString());

  const query = queryParams.toString();
  const endpoint = `/api/v1/intro-offers${query ? `?${query}` : ""}`;
  
  return makeRequest<PaginatedResponse<IntroOffer>>(endpoint);
}

export async function getIntroOfferSummary(): Promise<IntroOfferSummary> {
  return makeRequest<IntroOfferSummary>("/api/v1/intro-offers/summary");
}

export async function updateIntroOffer(id: string, data: {
  status?: string;
  notes?: string;
}): Promise<IntroOffer> {
  return makeRequest<IntroOffer>(`/api/v1/intro-offers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getStudents(params: {
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<PaginatedResponse<Student>> {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.offset) queryParams.append("offset", params.offset.toString());
  if (params.search) queryParams.append("search", params.search);

  const query = queryParams.toString();
  const endpoint = `/api/v1/students${query ? `?${query}` : ""}`;
  
  return makeRequest<PaginatedResponse<Student>>(endpoint);
}

export function isMindbodyAnalyticsConfigured(): boolean {
  return !!API_KEY;
}

export interface MBCommunication {
  id: string;
  offerId: string;
  studentId: string;
  channel: "email" | "sms";
  direction: "outbound" | "inbound";
  subject?: string;
  body?: string;
  recipientAddress?: string;
  status?: string;
  sentAt: string;
  createdBy?: string;
  idempotencyKey?: string;
}

export async function getOfferCommunications(studentId: string): Promise<MBCommunication[]> {
  try {
    const result = await makeRequest<{ data: MBCommunication[] }>(
      `/api/v1/intro-offers/${studentId}/communications`
    );
    return result.data || [];
  } catch (error: any) {
    console.warn("[MBSync] Failed to fetch communications:", error.message);
    return [];
  }
}

export async function pushCommunication(studentId: string, comm: {
  studentId: string;
  channel: string;
  direction: string;
  subject?: string;
  body?: string;
  recipientAddress?: string;
  status?: string;
  sentAt: string;
  createdBy?: string;
  idempotencyKey: string;
}): Promise<MBCommunication | null> {
  try {
    const result = await makeRequest<{ data: MBCommunication }>(
      `/api/v1/intro-offers/${studentId}/communications`,
      {
        method: "POST",
        body: JSON.stringify(comm),
      }
    );
    return result.data || null;
  } catch (error: any) {
    console.warn("[MBSync] Failed to push communication:", error.message);
    return null;
  }
}
