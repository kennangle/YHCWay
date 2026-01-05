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

export async function getCompanies() {
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
