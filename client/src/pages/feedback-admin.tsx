import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bug, Lightbulb, Clock, CheckCircle, XCircle, AlertCircle, User, Calendar } from "lucide-react";
import { format } from "date-fns";

interface FeedbackEntry {
  id: number;
  type: "bug" | "feature";
  title: string;
  description: string;
  status: string;
  userId: number;
  tenantId: string;
  createdAt: string;
  user?: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

const statusOptions = [
  { value: "new", label: "New", icon: AlertCircle, color: "bg-blue-500" },
  { value: "in_progress", label: "In Progress", icon: Clock, color: "bg-yellow-500" },
  { value: "resolved", label: "Resolved", icon: CheckCircle, color: "bg-green-500" },
  { value: "closed", label: "Closed", icon: XCircle, color: "bg-gray-500" },
];

function getStatusBadge(status: string) {
  const option = statusOptions.find(o => o.value === status) || statusOptions[0];
  const Icon = option.icon;
  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${option.color}`} />
      {option.label}
    </Badge>
  );
}

function FeedbackCard({ entry, onStatusChange }: { entry: FeedbackEntry; onStatusChange: (id: number, status: string) => void }) {
  const userName = entry.user 
    ? `${entry.user.firstName || ""} ${entry.user.lastName || ""}`.trim() || entry.user.email
    : "Unknown User";

  return (
    <Card className="backdrop-blur-md bg-card/80 border-white/10" data-testid={`feedback-card-${entry.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {entry.type === "bug" ? (
              <Bug className="w-5 h-5 text-red-500" />
            ) : (
              <Lightbulb className="w-5 h-5 text-yellow-500" />
            )}
            <CardTitle className="text-lg">{entry.title}</CardTitle>
          </div>
          {getStatusBadge(entry.status)}
        </div>
        <CardDescription className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {userName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{entry.description}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Update status:</span>
          <Select value={entry.status} onValueChange={(value) => onStatusChange(entry.id, value)}>
            <SelectTrigger className="w-40" data-testid={`status-select-${entry.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${option.color}`} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeedbackAdmin() {
  const [activeTab, setActiveTab] = useState<"all" | "bug" | "feature">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbackEntries = [], isLoading } = useQuery<FeedbackEntry[]>({
    queryKey: ["/api/feedback"],
    queryFn: async () => {
      const res = await fetch("/api/feedback", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/feedback/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      toast({
        title: "Status updated",
        description: "The feedback status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const filteredEntries = feedbackEntries.filter(entry => {
    if (activeTab !== "all" && entry.type !== activeTab) return false;
    if (statusFilter !== "all" && entry.status !== statusFilter) return false;
    return true;
  });

  const bugCount = feedbackEntries.filter(e => e.type === "bug").length;
  const featureCount = feedbackEntries.filter(e => e.type === "feature").length;
  const newCount = feedbackEntries.filter(e => e.status === "new").length;

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="feedback-admin-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback Management</h1>
          <p className="text-muted-foreground">
            View and manage bug reports and feature requests from users
          </p>
        </div>
        {newCount > 0 && (
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {newCount} new
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="backdrop-blur-md bg-card/80 border-white/10">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-red-500/20">
              <Bug className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{bugCount}</p>
              <p className="text-sm text-muted-foreground">Bug Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-md bg-card/80 border-white/10">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-yellow-500/20">
              <Lightbulb className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{featureCount}</p>
              <p className="text-sm text-muted-foreground">Feature Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-md bg-card/80 border-white/10">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 rounded-full bg-blue-500/20">
              <AlertCircle className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{newCount}</p>
              <p className="text-sm text-muted-foreground">Awaiting Review</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="backdrop-blur-md bg-card/80 border-white/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "bug" | "feature")}>
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all">
                  All ({feedbackEntries.length})
                </TabsTrigger>
                <TabsTrigger value="bug" data-testid="tab-bugs">
                  <Bug className="w-4 h-4 mr-1" />
                  Bugs ({bugCount})
                </TabsTrigger>
                <TabsTrigger value="feature" data-testid="tab-features">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Features ({featureCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${option.color}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading feedback...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2">No feedback entries found</div>
              <p className="text-sm text-muted-foreground">
                {feedbackEntries.length === 0 
                  ? "When users submit bug reports or feature requests, they'll appear here."
                  : "Try adjusting your filters to see more entries."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map(entry => (
                <FeedbackCard 
                  key={entry.id} 
                  entry={entry} 
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
