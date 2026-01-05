// Gusto API integration for employee directory and payroll data

const GUSTO_API_TOKEN = process.env.GUSTO_API_TOKEN;
// Use production API if GUSTO_USE_PRODUCTION is set, otherwise demo
const GUSTO_BASE_URL = process.env.GUSTO_USE_PRODUCTION === 'true' 
  ? 'https://api.gusto.com' 
  : 'https://api.gusto-demo.com';

export function isGustoConfigured(): boolean {
  return !!GUSTO_API_TOKEN;
}

async function gustoRequest(endpoint: string, options: RequestInit = {}) {
  if (!GUSTO_API_TOKEN) {
    throw new Error('Gusto API token not configured');
  }

  const url = `${GUSTO_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GUSTO_API_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Gusto-API-Version': '2025-06-15',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gusto API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function getTokenInfo() {
  return gustoRequest('/v1/token_info');
}

export async function getCurrentUser() {
  return gustoRequest('/v1/me');
}

export async function getCompanies() {
  // First try to get token info to find the company
  try {
    const tokenInfo = await getTokenInfo();
    console.log('[Gusto] Token info:', JSON.stringify(tokenInfo));
    if (tokenInfo.resource && tokenInfo.resource.type === 'Company') {
      // Return the company from the token
      const company = await gustoRequest(`/v1/companies/${tokenInfo.resource.uuid}`);
      return [company];
    }
  } catch (e) {
    console.log('[Gusto] Token info failed, trying /v1/me:', e);
  }
  
  // Try /v1/me endpoint
  try {
    const me = await getCurrentUser();
    console.log('[Gusto] Me response:', JSON.stringify(me));
    if (me.companies && me.companies.length > 0) {
      return me.companies;
    }
  } catch (e) {
    console.log('[Gusto] /v1/me failed, trying /v1/companies:', e);
  }
  
  // Fall back to original endpoint
  return gustoRequest('/v1/companies');
}

export async function getCompany(companyId: string) {
  return gustoRequest(`/v1/companies/${companyId}`);
}

export async function getEmployees(companyId: string, page = 1, perPage = 25) {
  return gustoRequest(`/v1/companies/${companyId}/employees?page=${page}&per=${perPage}`);
}

export async function getEmployee(employeeId: string) {
  return gustoRequest(`/v1/employees/${employeeId}`);
}

export async function getPayrolls(companyId: string) {
  return gustoRequest(`/v1/companies/${companyId}/payrolls?processed=true`);
}

export async function getPayroll(companyId: string, payrollId: string) {
  return gustoRequest(`/v1/companies/${companyId}/payrolls/${payrollId}`);
}

export async function getPayrollReceipt(payrollId: string) {
  return gustoRequest(`/v1/payrolls/${payrollId}/receipt`);
}
