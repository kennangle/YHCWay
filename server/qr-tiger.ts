const QR_TIGER_API_KEY = process.env.QR_TIGER_API_KEY;
const QR_TIGER_BASE_URL = "https://api.qrtiger.com";

export function isQrTigerConfigured(): boolean {
  return !!QR_TIGER_API_KEY;
}

export function getQrTigerApiKey(): string | undefined {
  return QR_TIGER_API_KEY;
}

interface CreateQRCodeParams {
  name: string;
  destinationUrl: string;
  category: string;
  size?: number;
  colorDark?: string;
  backgroundColor?: string;
  logoUrl?: string;
}

interface QRCodeResponse {
  data: string;
  url: string;
  qrId?: string;
  id?: string;
}

export async function createDynamicQRCode(params: CreateQRCodeParams): Promise<QRCodeResponse> {
  if (!QR_TIGER_API_KEY) {
    throw new Error("QR Tiger API key not configured");
  }

  const response = await fetch(`${QR_TIGER_BASE_URL}/qr/dynamic`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${QR_TIGER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      qrCategory: "url",
      text: params.destinationUrl,
      size: params.size || 500,
      colorDark: params.colorDark || "#000000",
      backgroundColor: params.backgroundColor || "#ffffff",
      logo: params.logoUrl || undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`QR Tiger API error creating dynamic QR: ${response.status} - ${errorText}`);
    throw new Error(`QR Tiger API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("[QR Tiger] Create dynamic response:", JSON.stringify(result));
  
  const extractId = (obj: any): string | undefined => {
    if (!obj) return undefined;
    const id = obj.qrId || obj.qr_id || obj.id || obj.dynamicQrId || obj.dynamicQrCodeId ||
               obj.qrCodeId || obj.qr_code_id || obj.qrcode_id;
    if (id) return String(id);
    if (obj.data && typeof obj.data === 'object') {
      const nestedId = obj.data.qrId || obj.data.qr_id || obj.data.id || 
                       obj.data.dynamicQrId || obj.data.dynamicQrCodeId ||
                       obj.data.qrCodeId || obj.data.qr_code_id;
      if (nestedId) return String(nestedId);
    }
    if (obj.qr && typeof obj.qr === 'object') {
      const nestedId = obj.qr.id || obj.qr.qrId || obj.qr.qr_id;
      if (nestedId) return String(nestedId);
    }
    return undefined;
  };
  
  const qrId = extractId(result);
  
  return {
    data: typeof result.data === 'string' ? result.data : (result.qr || result.qrImage || ""),
    url: result.url || result.shortUrl || result.short_url || (result.data?.url) || "",
    qrId: qrId,
    id: qrId,
  };
}

export async function createStaticQRCode(params: CreateQRCodeParams): Promise<QRCodeResponse> {
  if (!QR_TIGER_API_KEY) {
    throw new Error("QR Tiger API key not configured");
  }

  const response = await fetch(`${QR_TIGER_BASE_URL}/qr/static`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${QR_TIGER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      qrCategory: "url",
      text: params.destinationUrl,
      size: params.size || 500,
      colorDark: params.colorDark || "#000000",
      backgroundColor: params.backgroundColor || "#ffffff",
      logo: params.logoUrl || undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`QR Tiger API error creating static QR: ${response.status} - ${errorText}`);
    throw new Error(`QR Tiger API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("[QR Tiger] Create static response:", JSON.stringify(result));
  
  const extractId = (obj: any): string | undefined => {
    if (!obj) return undefined;
    const id = obj.qrId || obj.qr_id || obj.id || obj.staticQrId || obj.staticQrCodeId ||
               obj.qrCodeId || obj.qr_code_id || obj.qrcode_id;
    if (id) return String(id);
    if (obj.data && typeof obj.data === 'object') {
      const nestedId = obj.data.qrId || obj.data.qr_id || obj.data.id || 
                       obj.data.staticQrId || obj.data.staticQrCodeId ||
                       obj.data.qrCodeId || obj.data.qr_code_id;
      if (nestedId) return String(nestedId);
    }
    if (obj.qr && typeof obj.qr === 'object') {
      const nestedId = obj.qr.id || obj.qr.qrId || obj.qr.qr_id;
      if (nestedId) return String(nestedId);
    }
    return undefined;
  };
  
  const qrId = extractId(result);
  
  return {
    data: typeof result.data === 'string' ? result.data : (result.qr || result.qrImage || ""),
    url: result.url || result.shortUrl || result.short_url || (result.data?.url) || "",
    qrId: qrId,
    id: qrId,
  };
}

interface QRCodeData {
  qrCodeId: string;
  qrName: string;
  qrType: string;
  shortURL: string;
  qrImageUrl: string;
  scans: number;
  createdAt: string;
}

export async function listQRCodes(): Promise<QRCodeData[]> {
  if (!QR_TIGER_API_KEY) {
    throw new Error("QR Tiger API key not configured");
  }

  // Note: QR Tiger's public API does not support listing existing QR codes.
  // Users can view their existing codes (21 active) in the QR Tiger dashboard.
  // New codes created through this app are tracked locally and will also appear
  // in the QR Tiger dashboard.
  // See: https://app.qrcode-tiger.com/?type=dashboard
  return [];
}

interface ScanData {
  date: string;
  country: string;
  city: string;
  device: string;
  os: string;
  totalScans: number;
}

export async function getQRCodeAnalytics(qrCodeId: string, startDate?: number, endDate?: number): Promise<ScanData[]> {
  if (!QR_TIGER_API_KEY) {
    throw new Error("QR Tiger API key not configured");
  }

  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate.toString());
  if (endDate) params.append("endDate", endDate.toString());

  const url = `${QR_TIGER_BASE_URL}/data/${qrCodeId}${params.toString() ? `?${params.toString()}` : ""}`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${QR_TIGER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`QR Tiger analytics error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    const scans = data.scans || data.data || data.graph || [];
    
    return Array.isArray(scans) ? scans.map((item: any) => ({
      date: item.date || item.timestamp || new Date().toISOString(),
      country: item.country || item.location?.country || "Unknown",
      city: item.city || item.location?.city || "Unknown",
      device: item.device || item.deviceType || "Unknown",
      os: item.os || item.operatingSystem || "Unknown",
      totalScans: item.totalScans || item.scans || item.count || 1,
    })) : [];
  } catch (error) {
    console.error("Error fetching QR Tiger analytics:", error);
    return [];
  }
}

export async function deleteQRCode(qrCodeId: string): Promise<void> {
  if (!QR_TIGER_API_KEY) {
    throw new Error("QR Tiger API key not configured");
  }

  const response = await fetch(`${QR_TIGER_BASE_URL}/qr/${qrCodeId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${QR_TIGER_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`QR Tiger delete error: ${response.status} - ${errorText}`);
    throw new Error(`QR Tiger API error: ${response.status} - ${errorText}`);
  }
}
