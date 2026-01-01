const QR_TIGER_API_KEY = process.env.QR_TIGER_API_KEY;
const QR_TIGER_BASE_URL = "https://qrcode-tiger.com/api/qr";

export function isQrTigerConfigured(): boolean {
  return !!QR_TIGER_API_KEY;
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
}

export async function createDynamicQRCode(params: CreateQRCodeParams): Promise<QRCodeResponse> {
  if (!QR_TIGER_API_KEY) {
    throw new Error("QR Tiger API key not configured");
  }

  const response = await fetch(`${QR_TIGER_BASE_URL}/dynamic`, {
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
    throw new Error(`QR Tiger API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function createStaticQRCode(params: CreateQRCodeParams): Promise<QRCodeResponse> {
  if (!QR_TIGER_API_KEY) {
    throw new Error("QR Tiger API key not configured");
  }

  const response = await fetch(`${QR_TIGER_BASE_URL}/static`, {
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
    throw new Error(`QR Tiger API error: ${response.status} - ${errorText}`);
  }

  return response.json();
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

  const response = await fetch("https://qrcode-tiger.com/api/user/qr", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${QR_TIGER_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QR Tiger API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.qrCodes || data.data || [];
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

  const url = `https://qrcode-tiger.com/api/data/${qrCodeId}${params.toString() ? `?${params.toString()}` : ""}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${QR_TIGER_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QR Tiger API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.scans || data.data || [];
}

export async function deleteQRCode(qrCodeId: string): Promise<void> {
  if (!QR_TIGER_API_KEY) {
    throw new Error("QR Tiger API key not configured");
  }

  const response = await fetch(`https://qrcode-tiger.com/api/qr/${qrCodeId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${QR_TIGER_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QR Tiger API error: ${response.status} - ${errorText}`);
  }
}
