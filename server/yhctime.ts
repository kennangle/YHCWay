const YHCTIME_BASE_URL = 'https://yhctime.com';

interface EmployeeStatus {
  employeeId: number;
  employeeName: string;
  status: 'active' | 'break' | 'offline';
  session?: {
    id: number;
    startTime: string;
    breakStatus: 'none' | 'active';
    grossDuration: number;
    breakDuration: number;
    netDuration: number;
  };
}

interface AllEmployeesStatusResponse {
  employees: EmployeeStatus[];
}

interface SessionHistoryItem {
  id: number;
  employeeId: number;
  employeeName?: string;
  startTime: string;
  endTime: string;
  grossDuration: number;
  breakDuration: number;
  netDuration: number;
  notes?: string;
  source?: string;
  approved?: boolean;
}

interface SessionHistoryResponse {
  sessions: SessionHistoryItem[];
  total?: number;
}

interface CreateSessionRequest {
  employeeId: number;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  notes?: string;
  idempotencyKey?: string;
}

interface UpdateSessionRequest {
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  notes?: string;
}

interface SessionResponse {
  id: number;
  employeeId: number;
  startTime: string;
  endTime: string;
  grossDuration: number;
  breakDuration: number;
  netDuration: number;
  notes?: string;
  source: string;
  approved: boolean;
}

class YHCTimeClient {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.YHCTIME_API_KEY || null;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('YHCTIME_API_KEY is not configured');
    }

    const url = `${YHCTIME_BASE_URL}${path}`;
    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...headers,
    };

    console.log(`[YHCTime] ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    console.log(`[YHCTime] Response status: ${response.status}, content-type: ${contentType}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[YHCTime] Error response: ${errorText.substring(0, 200)}`);
      throw new Error(`YHCTime API error (${response.status}): ${errorText}`);
    }

    // Check if response is HTML instead of JSON (indicates auth redirect)
    if (contentType.includes('text/html')) {
      const htmlText = await response.text();
      console.log(`[YHCTime] Received HTML instead of JSON: ${htmlText.substring(0, 200)}`);
      throw new Error('YHCTime API returned HTML - API may not be properly deployed or authenticated');
    }

    const data = await response.json();
    console.log(`[YHCTime] Response data:`, JSON.stringify(data).substring(0, 200));
    return data;
  }

  async getAllEmployeesStatus(): Promise<EmployeeStatus[]> {
    const rawData = await this.request<any[]>(
      'GET',
      '/api/integration/current-status'
    );
    
    // Transform API response to match expected interface
    return rawData.map((emp: any) => ({
      employeeId: emp.id,
      employeeName: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
      status: emp.status === 'active' ? 'active' : emp.status === 'break' ? 'break' : 'offline',
      email: emp.email,
      role: emp.role,
      session: emp.session,
    }));
  }

  async getEmployeeStatus(employeeId: number): Promise<EmployeeStatus> {
    return this.request<EmployeeStatus>(
      'GET',
      `/api/integration/employee/${employeeId}/status`
    );
  }

  async getSessionHistory(
    options: { start: string; end: string }
  ): Promise<SessionHistoryItem[]> {
    const params = new URLSearchParams();
    params.append('start', options.start);
    params.append('end', options.end);
    
    const path = `/api/integration/sessions?${params.toString()}`;
    
    const rawData = await this.request<any[]>('GET', path);
    
    // Transform API response to match expected interface
    return rawData.map((session: any) => ({
      id: session.id,
      employeeId: session.employeeId || session.employee_id,
      employeeName: session.employeeName || session.employee_name,
      startTime: session.startTime || session.start_time,
      endTime: session.endTime || session.end_time,
      grossDuration: session.grossDuration || session.gross_duration || 0,
      breakDuration: session.breakDuration || session.break_duration || 0,
      netDuration: session.netDuration || session.net_duration || 0,
      notes: session.notes,
      source: session.source,
      approved: session.approved,
    }));
  }

  async createSession(
    session: CreateSessionRequest
  ): Promise<SessionResponse> {
    const headers: Record<string, string> = {};
    if (session.idempotencyKey) {
      headers['Idempotency-Key'] = session.idempotencyKey;
    }
    
    return this.request<SessionResponse>(
      'POST',
      '/api/integration/sessions',
      session,
      headers
    );
  }

  async updateSession(
    sessionId: number,
    updates: UpdateSessionRequest
  ): Promise<SessionResponse> {
    return this.request<SessionResponse>(
      'PATCH',
      `/api/integration/sessions/${sessionId}`,
      updates
    );
  }
}

export const yhcTimeClient = new YHCTimeClient();
export type {
  EmployeeStatus,
  AllEmployeesStatusResponse,
  SessionHistoryItem,
  SessionHistoryResponse,
  CreateSessionRequest,
  UpdateSessionRequest,
  SessionResponse,
};
