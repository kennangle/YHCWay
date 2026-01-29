import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Calendar, Clock, User, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { User as UserType, TimeEntry, AuditLog } from "@shared/schema";

interface TimeEntryWithDetails extends TimeEntry {
  taskTitle?: string;
  projectName?: string;
}

export default function AdminReports() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<{
    timeEntries: TimeEntryWithDetails[];
    auditLogs: AuditLog[];
  }>({
    queryKey: ["/api/admin/reports/user-activity", selectedUserId, startDate, endDate],
    enabled: !!user?.isAdmin && !!selectedUserId && !!startDate && !!endDate,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const totalTimeSeconds = reportData?.timeEntries?.reduce((acc, entry) => acc + (entry.duration || 0), 0) || 0;

  const exportToCSV = () => {
    if (!reportData) return;
    
    const timeEntriesCSV = [
      ["Date", "Description", "Project", "Task", "Duration (minutes)", "Billable"],
      ...reportData.timeEntries.map(entry => [
        format(new Date(entry.startTime), "yyyy-MM-dd HH:mm"),
        entry.description || "",
        entry.projectName || "",
        entry.taskTitle || "",
        Math.round((entry.duration || 0) / 60),
        entry.isBillable ? "Yes" : "No"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([timeEntriesCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-report-${selectedUserId}-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Activity Report</h1>
            <p className="text-gray-600 mt-1">View time entries and activities for team members</p>
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-select">User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="user-select" data-testid="select-user">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={exportToCSV}
                  disabled={!reportData || reportData.timeEntries.length === 0}
                  variant="outline"
                  className="w-full"
                  data-testid="button-export-csv"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedUserId && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Time Tracked</p>
                      <p className="text-2xl font-bold text-gray-900">{formatDuration(totalTimeSeconds)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Time Entries</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData?.timeEntries?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Activities Logged</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData?.auditLogs?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time Entries
                  {selectedUser && (
                    <span className="text-sm font-normal text-gray-500">
                      for {selectedUser.firstName} {selectedUser.lastName}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : reportData?.timeEntries?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No time entries found for this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 font-medium text-gray-600">Date</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-600">Description</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-600">Project</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-600">Task</th>
                          <th className="text-right py-3 px-2 font-medium text-gray-600">Duration</th>
                          <th className="text-center py-3 px-2 font-medium text-gray-600">Billable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData?.timeEntries?.map((entry) => (
                          <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-2 whitespace-nowrap">
                              {format(new Date(entry.startTime), "MMM d, yyyy h:mm a")}
                            </td>
                            <td className="py-3 px-2">{entry.description || "-"}</td>
                            <td className="py-3 px-2">{entry.projectName || "-"}</td>
                            <td className="py-3 px-2">{entry.taskTitle || "-"}</td>
                            <td className="py-3 px-2 text-right font-medium">{formatDuration(entry.duration)}</td>
                            <td className="py-3 px-2 text-center">
                              {entry.isBillable ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Activity Log
                  {selectedUser && (
                    <span className="text-sm font-normal text-gray-500">
                      for {selectedUser.firstName} {selectedUser.lastName}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : reportData?.auditLogs?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No activities found for this period</p>
                ) : (
                  <div className="space-y-3">
                    {reportData?.auditLogs?.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{log.action}</span>
                            {log.resourceType && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                {log.resourceType}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {log.createdAt && format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
