import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Database, Server, Activity, Clock } from "lucide-react";
import { useState } from "react";

interface ServiceHealth {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastCheck: string;
  responseTimeMs?: number;
  consecutiveFailures?: number;
  lastError?: string;
}

interface SystemHealthData {
  status: string;
  timestamp: string;
  errors: {
    totalErrors: number;
    criticalErrors: number;
    serviceStatuses: Record<string, string>;
    recentErrorRate: number;
  };
  cache: {
    size: number;
    maxSize: number;
    hitRate?: number;
  };
  services: ServiceHealth[];
}

interface ErrorLog {
  timestamp: Date | string;
  error: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  service?: string;
  severity: "info" | "warn" | "error" | "critical";
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "healthy":
    case "operational":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "degraded":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "unhealthy":
    case "down":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-500" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    healthy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    operational: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    degraded: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    unhealthy: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    down: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <Badge className={variants[status] || variants.degraded} data-testid={`badge-status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, string> = {
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    critical: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return (
    <Badge className={variants[severity] || variants.info} data-testid={`badge-severity-${severity}`}>
      {severity.toUpperCase()}
    </Badge>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function SystemHealth() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery<SystemHealthData>({
    queryKey: ["/api/admin/system-health"],
    refetchInterval: 30000,
  });

  const { data: errorLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<ErrorLog[]>({
    queryKey: ["/api/admin/error-logs"],
    refetchInterval: 60000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchHealth(), refetchLogs()]);
    setIsRefreshing(false);
  };

  if (healthLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const overall = healthData?.status || "operational";

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="page-system-health">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-muted-foreground">Monitor system status and service health</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} data-testid="button-refresh">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-overall-status">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <StatusIcon status={overall} />
              <StatusBadge status={overall} />
            </div>
            {healthData?.timestamp && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {new Date(healthData.timestamp).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-errors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData?.errors?.recentErrorRate || 0}
            </div>
            <p className="text-xs text-muted-foreground">In last 5 minutes</p>
            {healthData?.errors?.criticalErrors ? (
              <p className="text-xs text-red-500 mt-1">
                {healthData.errors.criticalErrors} critical
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card data-testid="card-cache">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData?.cache?.size || 0} / {healthData?.cache?.maxSize || 1000}
            </div>
            <p className="text-xs text-muted-foreground">Cached items</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-errors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData?.errors?.totalErrors || 0}
            </div>
            <p className="text-xs text-muted-foreground">Since startup</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-services">
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Health status of connected services</CardDescription>
        </CardHeader>
        <CardContent>
          {healthData?.services && healthData.services.length > 0 ? (
            <div className="space-y-3">
              {healthData.services.map((service, index) => (
                <div
                  key={service.service}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`service-row-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon status={service.status} />
                    <div>
                      <p className="font-medium">{service.service}</p>
                      {service.lastError && (
                        <p className="text-sm text-muted-foreground">{service.lastError}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {service.responseTimeMs && (
                      <span className="text-sm text-muted-foreground">
                        {service.responseTimeMs}ms
                      </span>
                    )}
                    <StatusBadge status={service.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No service data available</p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-error-logs">
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
          <CardDescription>Latest error logs from the system</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : errorLogs && errorLogs.length > 0 ? (
            <div className="space-y-2">
              {errorLogs.slice(0, 10).map((log, index) => (
                <Alert key={index} variant="default" data-testid={`error-log-${index}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <AlertTitle className="flex items-center gap-2">
                        <SeverityBadge severity={log.severity} />
                        {log.service && <span className="text-sm text-muted-foreground">[{log.service}]</span>}
                      </AlertTitle>
                      <AlertDescription className="mt-1">{log.error}</AlertDescription>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </Alert>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No recent errors</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
