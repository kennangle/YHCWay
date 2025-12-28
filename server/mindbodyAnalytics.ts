const MINDBODY_ANALYTICS_BASE_URL = process.env.MINDBODY_ANALYTICS_URL || "https://mind-body-analytics-ken196.replit.app";
const API_KEY = process.env.MINDBODY_API_KEY;

interface IntroOffer {
  id: string;
  studentName: string;
  studentEmail?: string;
  offerName: string;
  purchaseDate: string;
  expirationDate?: string;
  status: string;
  attendanceCount?: number;
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
  total: number;
  limit: number;
  offset: number;
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
