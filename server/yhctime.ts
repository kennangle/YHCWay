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

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YHCTime API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getAllEmployeesStatus(): Promise<AllEmployeesStatusResponse> {
    return this.request<AllEmployeesStatusResponse>(
      'GET',
      '/api/integration/current-status'
    );
  }

  async getEmployeeStatus(employeeId: number): Promise<EmployeeStatus> {
    return this.request<EmployeeStatus>(
      'GET',
      `/api/integration/employee/${employeeId}/status`
    );
  }

  async getSessionHistory(
    options: { start: string; end: string }
  ): Promise<SessionHistoryResponse> {
    const params = new URLSearchParams();
    params.append('start', options.start);
    params.append('end', options.end);
    
    const path = `/api/integration/sessions?${params.toString()}`;
    
    return this.request<SessionHistoryResponse>('GET', path);
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
