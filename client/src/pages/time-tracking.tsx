import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Plus, Users, Calendar, Loader2, CheckCircle, Coffee, LogOut, Link2, Unlink, Trash2 } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useMainContentClass } from "@/hooks/useSidebarCollapse";

interface EmployeeStatus {
  employeeId: string;
  employeeName: string;
  email?: string;
  role?: string;
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
  id: string | number;
  employeeId: string;
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
  notLinked?: boolean;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'break':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active':
      return <CheckCircle className="w-4 h-4" />;
    case 'break':
      return <Coffee className="w-4 h-4" />;
    default:
      return <LogOut className="w-4 h-4" />;
  }
}

interface LinkedEmployee {
  linked: boolean;
  employeeId?: string;
  employeeName?: string;
}

export default function TimeTrackingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mainContentClass = useMainContentClass();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'custom'>('week');
  
  const now = new Date();
  const getDateRange = () => {
    switch (dateRange) {
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: subDays(now, 7), end: now };
    }
  };
  
  const { start, end } = getDateRange();

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: "09:00",
    endTime: "17:00",
    breakDuration: "0",
    notes: "",
  });

  const { data: status, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/yhctime/status"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: linkedEmployee } = useQuery<LinkedEmployee>({
    queryKey: ["/api/yhctime/linked-employee"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: status?.connected,
  });

  const { data: employeesStatus, isLoading: employeesLoading } = useQuery<AllEmployeesStatusResponse>({
    queryKey: ["/api/yhctime/current-status"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: status?.connected,
    refetchInterval: 60000,
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<SessionHistoryResponse>({
    queryKey: ["/api/yhctime/sessions", format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')],
    queryFn: async () => {
      const res = await fetch(
        `/api/yhctime/sessions?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: status?.connected,
  });

  const employees = employeesStatus?.employees || [];
  const sessions = sessionsData?.sessions || [];

  // Use linked employee if available, otherwise try auto-detection
  const currentUserEmployee = linkedEmployee?.linked 
    ? { employeeId: linkedEmployee.employeeId!, employeeName: linkedEmployee.employeeName! }
    : employees.find(emp => {
        const firstName = (user?.firstName || '').toLowerCase().trim();
        const lastName = (user?.lastName || '').toLowerCase().trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const empName = emp.employeeName.toLowerCase().trim();
        const emailPrefix = user?.email?.split('@')[0].toLowerCase() || '';
        
        // Try multiple matching strategies
        if (empName === fullName) return true;
        if (firstName && empName === firstName) return true;
        if (firstName && empName.startsWith(firstName + ' ')) return true;
        if (firstName && firstName.length >= 3 && empName.includes(firstName)) return true;
        if (fullName.includes(empName) || empName.includes(fullName)) return true;
        if (emailPrefix && empName.includes(emailPrefix)) return true;
        if (emailPrefix && emailPrefix.includes(empName.split(' ')[0])) return true;
        
        return false;
      });

  const linkMutation = useMutation({
    mutationFn: async (employee: { employeeId: string; employeeName: string }) => {
      const res = await fetch("/api/yhctime/link-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to link employee");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/yhctime/linked-employee"] });
      setIsLinkOpen(false);
      toast.success("Successfully linked to YHCTime employee");
    },
    onError: () => {
      toast.error("Failed to link employee");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/yhctime/link-employee", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to unlink employee");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/yhctime/linked-employee"] });
      toast.success("Unlinked from YHCTime employee");
    },
    onError: () => {
      toast.error("Failed to unlink employee");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!currentUserEmployee) {
        throw new Error("Could not find your employee record in YHCTime");
      }
      
      const startDateTime = new Date(`${data.date}T${data.startTime}:00`);
      const endDateTime = new Date(`${data.date}T${data.endTime}:00`);
      
      const res = await fetch("/api/yhctime/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: currentUserEmployee.employeeId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          breakDuration: parseInt(data.breakDuration, 10) * 60000,
          notes: data.notes || undefined,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create session");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/yhctime/sessions"] });
      setIsCreateOpen(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: "09:00",
        endTime: "17:00",
        breakDuration: "0",
        notes: "",
      });
      toast.success("Time entry created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create time entry");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string | number) => {
      const res = await fetch(`/api/yhctime/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete session");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/yhctime/sessions"] });
      toast.success("Time entry deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete time entry");
    },
  });

  if (statusLoading) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center"
        style={{ backgroundImage: `url(${generatedBg})` }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${generatedBg})` }}
      >
        <UnifiedSidebar />
        <main className={`${mainContentClass} min-h-screen transition-all duration-300`}>
          <TopBar />
          <div className="p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="glass-card p-8 rounded-2xl text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">YHCTime Not Connected</h2>
                <p className="text-muted-foreground mb-4">
                  The YHCTIME_API_KEY is not configured. Please add it in your environment secrets.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${generatedBg})` }}
    >
      <UnifiedSidebar />
      
      <main className={`${mainContentClass} min-h-screen transition-all duration-300`}>
        <TopBar />
        
        <div className="p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                  <Clock className="w-8 h-8 text-primary" />
                  Time Tracking
                </h1>
                <p className="text-muted-foreground">
                  View employee status and manage work sessions
                </p>
              </div>
              
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-session">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Time Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Time Entry</DialogTitle>
                  </DialogHeader>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      createMutation.mutate(formData);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label>Employee</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background text-sm">
                          {linkedEmployee?.linked ? (
                            <span data-testid="text-current-employee" className="text-green-600 font-medium">
                              {linkedEmployee.employeeName} (linked)
                            </span>
                          ) : currentUserEmployee ? (
                            <span data-testid="text-current-employee">{currentUserEmployee.employeeName}</span>
                          ) : (
                            <span className="text-muted-foreground">
                              {user?.firstName} {user?.lastName} (not found in YHCTime)
                            </span>
                          )}
                        </div>
                        {linkedEmployee?.linked ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => unlinkMutation.mutate()}
                            disabled={unlinkMutation.isPending}
                            data-testid="button-unlink-employee"
                          >
                            <Unlink className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsLinkOpen(true)}
                            data-testid="button-link-employee"
                          >
                            <Link2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        data-testid="input-date"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                          data-testid="input-start-time"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                          data-testid="input-end-time"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                      <Input
                        id="breakDuration"
                        type="number"
                        min="0"
                        value={formData.breakDuration}
                        onChange={(e) => setFormData(prev => ({ ...prev, breakDuration: e.target.value }))}
                        data-testid="input-break-duration"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any notes about this session..."
                        data-testid="input-notes"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createMutation.isPending || !currentUserEmployee}
                      data-testid="button-submit-session"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Time Entry"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link to YHCTime Employee</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Link your account to your YHCTime employee profile. This will be used when creating time entries.
                    </p>
                    {(() => {
                      const matchingEmployee = employees.find(emp => 
                        emp.email?.toLowerCase() === user?.email?.toLowerCase()
                      );
                      
                      if (!matchingEmployee) {
                        return (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground">No matching YHCTime account found.</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Your email ({user?.email}) doesn't match any employee in YHCTime.
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => linkMutation.mutate({ 
                            employeeId: matchingEmployee.employeeId, 
                            employeeName: matchingEmployee.employeeName 
                          })}
                          disabled={linkMutation.isPending}
                          data-testid={`button-select-employee-${matchingEmployee.employeeId}`}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          {matchingEmployee.employeeName}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {matchingEmployee.email}
                          </span>
                        </Button>
                      );
                    })()}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="status" className="space-y-6">
              <TabsList className="glass-card">
                <TabsTrigger value="status" data-testid="tab-status">
                  <Users className="w-4 h-4 mr-2" />
                  My Profile
                </TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history">
                  <Calendar className="w-4 h-4 mr-2" />
                  Session History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="status">
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="text-xl font-semibold mb-4">My Profile</h2>
                  
                  {employeesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (() => {
                    const myEmployee = employees.find(emp => 
                      emp.email?.toLowerCase() === user?.email?.toLowerCase()
                    );
                    
                    if (!myEmployee) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">
                            No matching YHCTime account found for {user?.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            You can still add time entries by linking to your YHCTime account.
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="max-w-md">
                        <div 
                          className="p-6 rounded-xl bg-background/50 border border-border"
                          data-testid={`card-employee-${myEmployee.employeeId}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-lg">{myEmployee.employeeName}</h3>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500 text-white text-sm">
                              <CheckCircle className="w-4 h-4" />
                              <span>Linked</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{myEmployee.email}</p>
                          <p className="text-sm text-muted-foreground mb-3 capitalize">Role: {myEmployee.role?.replace('_', ' ')}</p>
                          
                          <div className="border-t border-border pt-4 mt-4">
                            <p className="text-sm text-muted-foreground mb-3">
                              You can add time entries anytime using the "Add Time Entry" button above.
                            </p>
                            <Button 
                              onClick={() => setIsCreateOpen(true)}
                              className="w-full"
                              data-testid="button-add-time-quick"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Time Entry
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="history">
                <div className="glass-card p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Session History</h2>
                    <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                      <SelectTrigger className="w-40" data-testid="select-date-range">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {sessionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : sessionsData?.notLinked ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        You need to link your account to view your time entries.
                      </p>
                      <Button onClick={() => setIsLinkOpen(true)} data-testid="button-link-to-view">
                        <Link2 className="w-4 h-4 mr-2" />
                        Link YHCTime Account
                      </Button>
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No sessions found for the selected period
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium">Employee</th>
                            <th className="text-left py-3 px-4 font-medium">Date</th>
                            <th className="text-left py-3 px-4 font-medium">Start</th>
                            <th className="text-left py-3 px-4 font-medium">End</th>
                            <th className="text-left py-3 px-4 font-medium">Net Time</th>
                            <th className="text-left py-3 px-4 font-medium">Break</th>
                            <th className="text-left py-3 px-4 font-medium">Status</th>
                            <th className="text-left py-3 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((session) => (
                            <tr 
                              key={session.id} 
                              className="border-b border-border/50 hover:bg-background/30"
                              data-testid={`row-session-${session.id}`}
                            >
                              <td className="py-3 px-4">{session.employeeName || `Employee #${session.employeeId}`}</td>
                              <td className="py-3 px-4">{format(new Date(session.startTime), 'MMM d, yyyy')}</td>
                              <td className="py-3 px-4">{format(new Date(session.startTime), 'h:mm a')}</td>
                              <td className="py-3 px-4">{format(new Date(session.endTime), 'h:mm a')}</td>
                              <td className="py-3 px-4">{formatDuration(session.netDuration)}</td>
                              <td className="py-3 px-4">{formatDuration(session.breakDuration)}</td>
                              <td className="py-3 px-4">
                                {session.approved ? (
                                  <span className="text-green-600 text-sm">Approved</span>
                                ) : (
                                  <span className="text-yellow-600 text-sm">Pending</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this time entry?")) {
                                      deleteMutation.mutate(session.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-session-${session.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
