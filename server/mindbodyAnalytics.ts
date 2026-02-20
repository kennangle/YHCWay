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
  expirationDate?: string | null;
  conversionAmount?: string | null;
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

interface RawIntroOffer {
  id: string;
  student_id?: string;
  studentId?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  offer_name?: string;
  offerName?: string;
  offer_category?: string;
  offerCategory?: string;
  purchase_amount?: string;
  purchaseAmount?: string;
  purchase_date?: string;
  purchaseDate?: string;
  classes_attended_since_purchase?: number;
  classesAttendedSincePurchase?: number;
  last_attendance_date?: string;
  lastAttendanceDate?: string;
  days_since_last_attendance?: number;
  daysSinceLastAttendance?: number;
  days_since_purchase?: number;
  daysSincePurchase?: number;
  has_converted?: boolean;
  hasConverted?: boolean;
  conversion_date?: string;
  conversionDate?: string;
  conversion_type?: string;
  conversionType?: string;
  conversion_amount?: string | null;
  conversionAmount?: string | null;
  member_status?: string;
  memberStatus?: string;
  expiration_date?: string | null;
  expirationDate?: string | null;
  notes?: string;
}

function normalizeIntroOffer(raw: RawIntroOffer): IntroOffer {
  return {
    id: raw.id,
    studentId: raw.studentId || raw.student_id || "",
    firstName: raw.firstName || raw.first_name || "",
    lastName: raw.lastName || raw.last_name || "",
    email: raw.email,
    phone: raw.phone,
    offerName: raw.offerName || raw.offer_name || "",
    offerCategory: raw.offerCategory || raw.offer_category || "",
    purchaseAmount: raw.purchaseAmount || raw.purchase_amount || "0",
    purchaseDate: raw.purchaseDate || raw.purchase_date || "",
    classesAttendedSincePurchase: raw.classesAttendedSincePurchase ?? raw.classes_attended_since_purchase ?? 0,
    lastAttendanceDate: raw.lastAttendanceDate || raw.last_attendance_date,
    daysSinceLastAttendance: raw.daysSinceLastAttendance ?? raw.days_since_last_attendance,
    daysSincePurchase: raw.daysSincePurchase ?? raw.days_since_purchase ?? 0,
    hasConverted: raw.hasConverted ?? raw.has_converted ?? false,
    conversionDate: raw.conversionDate || raw.conversion_date,
    conversionType: raw.conversionType || raw.conversion_type,
    memberStatus: raw.memberStatus || raw.member_status || "unknown",
    expirationDate: raw.expirationDate || raw.expiration_date,
    conversionAmount: raw.conversionAmount || raw.conversion_amount,
    notes: raw.notes,
  };
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
  const pageSize = 100;
  const allData: IntroOffer[] = [];
  let currentOffset = params.offset || 0;
  let totalFromApi = 0;

  while (true) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.since) queryParams.append("since", params.since);
    queryParams.append("limit", pageSize.toString());
    queryParams.append("offset", currentOffset.toString());

    const query = queryParams.toString();
    const endpoint = `/api/v1/intro-offers${query ? `?${query}` : ""}`;
    const page = await makeRequest<PaginatedResponse<RawIntroOffer>>(endpoint);

    allData.push(...page.data.map(normalizeIntroOffer));
    totalFromApi = page.meta.count;
    
    console.log(`[IntroOffers] Fetched page at offset ${currentOffset}: ${page.data.length} records (meta.count=${page.meta.count}, total so far=${allData.length})`);

    if (page.data.length < pageSize) {
      break;
    }

    currentOffset += pageSize;

    if (params.limit && allData.length >= params.limit) {
      break;
    }
  }

  console.log(`[IntroOffers] Pagination complete: ${allData.length} total records fetched`);

  return {
    data: params.limit ? allData.slice(0, params.limit) : allData,
    meta: {
      count: allData.length,
      limit: params.limit || allData.length,
      offset: params.offset || 0,
    },
  };
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
