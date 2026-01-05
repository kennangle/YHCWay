import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, Building2, RefreshCw, Mail, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/hooks/useAuth";

interface Company {
  uuid: string;
  name: string;
  trade_name?: string;
  ein?: string;
  entity_type?: string;
  company_status?: string;
}

interface Employee {
  uuid: string;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  hire_date?: string;
  termination_date?: string;
  department?: string;
  current_employment_status?: string;
  terminated?: boolean;
  jobs?: { title?: string; rate?: string; payment_unit?: string }[];
}

interface Payroll {
  payroll_uuid: string;
  pay_period: { start_date: string; end_date: string };
  check_date: string;
  processed: boolean;
  totals?: {
    gross_pay?: string;
    net_pay?: string;
    employer_taxes?: string;
    employee_taxes?: string;
  };
  employee_compensations?: any[];
}

export default function GustoPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  const { data: status, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ['/api/gusto/status'],
    enabled: !!user?.isAdmin,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: companies, isLoading: companiesLoading, refetch: refetchCompanies } = useQuery<Company[]>({
    queryKey: ['/api/gusto/companies'],
    enabled: status?.connected === true,
  });

  const { data: employees, isLoading: employeesLoading, refetch: refetchEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/gusto/companies', selectedCompany, 'employees'],
    queryFn: async () => {
      const res = await fetch(`/api/gusto/companies/${selectedCompany}/employees`);
      if (!res.ok) throw new Error('Failed to fetch employees');
      return res.json();
    },
    enabled: !!selectedCompany,
  });

  const { data: payrolls, isLoading: payrollsLoading, refetch: refetchPayrolls } = useQuery<Payroll[]>({
    queryKey: ['/api/gusto/companies', selectedCompany, 'payrolls'],
    queryFn: async () => {
      const res = await fetch(`/api/gusto/companies/${selectedCompany}/payrolls`);
      if (!res.ok) throw new Error('Failed to fetch payrolls');
      const data = await res.json();
      return data
        .filter((p: Payroll) => parseFloat(p.totals?.gross_pay || '0') > 0)
        .sort((a: Payroll, b: Payroll) => new Date(b.check_date).getTime() - new Date(a.check_date).getTime());
    },
    enabled: !!selectedCompany,
  });

  // Auto-select first company
  if (companies && companies.length > 0 && !selectedCompany) {
    setSelectedCompany(companies[0].uuid);
  }

  const handleRefresh = () => {
    refetchCompanies();
    if (selectedCompany) {
      refetchEmployees();
      refetchPayrolls();
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex font-sans">
        <UnifiedSidebar />
        <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
          <TopBar />
          <div className="flex-1 p-6 max-w-7xl mx-auto">
            <Card className="backdrop-blur-sm bg-white/80 border-white/20">
              <CardContent className="p-8 text-center">
                <RefreshCw className="h-12 w-12 mx-auto text-gray-400 mb-4 animate-spin" />
                <p className="text-gray-500">Checking Gusto connection...</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex font-sans">
        <UnifiedSidebar />
        <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
          <TopBar />
          <div className="flex-1 p-6 max-w-7xl mx-auto">
            <Card className="backdrop-blur-sm bg-white/80 border-white/20">
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Gusto Not Connected</h2>
                <p className="text-gray-500">
                  Gusto API token is not configured. Please add GUSTO_API_TOKEN to your environment variables.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <UnifiedSidebar />
      <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gusto HR & Payroll</h1>
          <p className="text-gray-500">Manage employee directory and payroll data</p>
        </div>
        <div className="flex items-center gap-3">
          {companies && companies.length > 1 && (
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-64" data-testid="select-company">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.uuid} value={company.uuid}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {companiesLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-20 bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="backdrop-blur-sm bg-white/80 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Employees</p>
                  <p className="text-2xl font-bold">{employees?.filter(e => !e.terminated).length || 0}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-sm bg-white/80 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Payrolls</p>
                  <p className="text-2xl font-bold">{payrolls?.length || 0}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-sm bg-white/80 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Company</p>
                  <p className="text-lg font-bold truncate">{companies?.find(c => c.uuid === selectedCompany)?.name || '-'}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="employees" className="w-full">
        <TabsList>
          <TabsTrigger value="employees" data-testid="tab-employees">Employee Directory</TabsTrigger>
          <TabsTrigger value="payrolls" data-testid="tab-payrolls">Payroll History</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          <Card className="backdrop-blur-sm bg-white/80 border-white/20">
            <CardHeader>
              <CardTitle className="text-lg">Employee Directory</CardTitle>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : employees && employees.length > 0 ? (
                <div className="space-y-2">
                  {employees.filter(e => !e.terminated).map((employee, idx) => (
                    <div
                      key={employee.uuid}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      data-testid={`employee-row-${idx}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {employee.first_name?.[0]}{employee.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium">
                            {employee.first_name} {employee.middle_initial ? `${employee.middle_initial}. ` : ''}{employee.last_name}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            {employee.jobs?.[0]?.title && (
                              <span>{employee.jobs[0].title}</span>
                            )}
                            {employee.department && (
                              <span>• {employee.department}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {employee.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Mail className="h-4 w-4" />
                            <span className="hidden md:inline">{employee.email}</span>
                          </div>
                        )}
                        {employee.hire_date && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>Hired {format(new Date(employee.hire_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        <Badge className={
                          employee.current_employment_status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }>
                          {employee.current_employment_status || 'Active'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No employees found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payrolls" className="mt-4">
          <Card className="backdrop-blur-sm bg-white/80 border-white/20">
            <CardHeader>
              <CardTitle className="text-lg">Payroll History</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : payrolls && payrolls.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Pay Period</th>
                        <th className="text-left py-2 px-3 font-medium">Check Date</th>
                        <th className="text-right py-2 px-3 font-medium">Gross Pay</th>
                        <th className="text-right py-2 px-3 font-medium">Net Pay</th>
                        <th className="text-left py-2 px-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrolls.map((payroll, idx) => (
                        <tr key={payroll.payroll_uuid} className="border-b hover:bg-gray-50" data-testid={`payroll-row-${idx}`}>
                          <td className="py-3 px-3">
                            {format(new Date(payroll.pay_period.start_date), 'MMM d')} - {format(new Date(payroll.pay_period.end_date), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 px-3">
                            {format(new Date(payroll.check_date), 'MMM d, yyyy')}
                          </td>
                          <td className="text-right py-3 px-3 font-medium">
                            ${parseFloat(payroll.totals?.gross_pay || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-right py-3 px-3 text-green-600 font-medium">
                            ${parseFloat(payroll.totals?.net_pay || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3">
                            <Badge className={payroll.processed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                              {payroll.processed ? 'Processed' : 'Pending'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No payrolls found</p>
                </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
