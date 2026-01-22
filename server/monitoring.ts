interface ErrorLog {
  timestamp: Date;
  error: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  service?: string;
  severity: "info" | "warn" | "error" | "critical";
}

interface ServiceHealth {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastCheck: Date;
  lastError?: string;
  responseTimeMs?: number;
  consecutiveFailures: number;
}

interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

class MonitoringService {
  private errorLogs: ErrorLog[] = [];
  private serviceHealth = new Map<string, ServiceHealth>();
  private metrics: Metric[] = [];
  private maxLogSize = 1000;
  private maxMetricSize = 10000;

  logError(
    error: Error | string,
    context?: Record<string, any>,
    severity: ErrorLog["severity"] = "error"
  ): void {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      userId: context?.userId,
      service: context?.service,
      severity,
    };

    this.errorLogs.unshift(errorLog);
    if (this.errorLogs.length > this.maxLogSize) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogSize);
    }

    const logFn = severity === "critical" || severity === "error" 
      ? console.error 
      : severity === "warn" 
        ? console.warn 
        : console.log;
    
    logFn(`[${severity.toUpperCase()}] ${errorLog.error}`, context || "");
  }

  logInfo(message: string, context?: Record<string, any>): void {
    this.logError(message, context, "info");
  }

  logWarn(message: string, context?: Record<string, any>): void {
    this.logError(message, context, "warn");
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.unshift({
      name,
      value,
      timestamp: new Date(),
      tags,
    });

    if (this.metrics.length > this.maxMetricSize) {
      this.metrics = this.metrics.slice(0, this.maxMetricSize);
    }
  }

  updateServiceHealth(
    service: string,
    status: ServiceHealth["status"],
    responseTimeMs?: number,
    error?: string
  ): void {
    const existing = this.serviceHealth.get(service);
    
    const health: ServiceHealth = {
      service,
      status,
      lastCheck: new Date(),
      responseTimeMs,
      lastError: status !== "healthy" ? error : undefined,
      consecutiveFailures: status !== "healthy" 
        ? (existing?.consecutiveFailures || 0) + 1 
        : 0,
    };

    this.serviceHealth.set(service, health);

    if (health.consecutiveFailures >= 3 && status !== "healthy") {
      this.logError(
        `Service ${service} has ${health.consecutiveFailures} consecutive failures`,
        { service, lastError: error },
        "critical"
      );
    }
  }

  async checkServiceHealth(
    service: string,
    healthCheck: () => Promise<void>,
    timeoutMs = 10000
  ): Promise<ServiceHealth> {
    const start = Date.now();
    
    try {
      await Promise.race([
        healthCheck(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Health check timeout")), timeoutMs)
        ),
      ]);
      
      const responseTime = Date.now() - start;
      this.updateServiceHealth(service, "healthy", responseTime);
    } catch (error: any) {
      const responseTime = Date.now() - start;
      this.updateServiceHealth(
        service,
        responseTime > timeoutMs / 2 ? "degraded" : "unhealthy",
        responseTime,
        error.message
      );
    }

    return this.serviceHealth.get(service)!;
  }

  getServiceHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values());
  }

  getRecentErrors(limit = 50, severity?: ErrorLog["severity"]): ErrorLog[] {
    let logs = this.errorLogs;
    if (severity) {
      logs = logs.filter((log) => log.severity === severity);
    }
    return logs.slice(0, limit);
  }

  getMetrics(name?: string, since?: Date): Metric[] {
    let metrics = this.metrics;
    
    if (name) {
      metrics = metrics.filter((m) => m.name === name);
    }
    
    if (since) {
      metrics = metrics.filter((m) => m.timestamp >= since);
    }
    
    return metrics;
  }

  getStats(): {
    totalErrors: number;
    criticalErrors: number;
    serviceStatuses: Record<string, string>;
    recentErrorRate: number;
  } {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentErrors = this.errorLogs.filter(
      (log) => log.timestamp >= fiveMinutesAgo && 
        (log.severity === "error" || log.severity === "critical")
    );

    const serviceStatuses: Record<string, string> = {};
    const entries = Array.from(this.serviceHealth.entries());
    for (const [service, health] of entries) {
      serviceStatuses[service] = health.status;
    }

    return {
      totalErrors: this.errorLogs.filter(
        (log) => log.severity === "error" || log.severity === "critical"
      ).length,
      criticalErrors: this.errorLogs.filter(
        (log) => log.severity === "critical"
      ).length,
      serviceStatuses,
      recentErrorRate: recentErrors.length,
    };
  }

  clearLogs(): void {
    this.errorLogs = [];
  }
}

export const monitoring = new MonitoringService();

export async function trackOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - start;
    
    monitoring.recordMetric(`operation.${operationName}.duration`, duration);
    monitoring.recordMetric(`operation.${operationName}.success`, 1);
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    
    monitoring.recordMetric(`operation.${operationName}.duration`, duration);
    monitoring.recordMetric(`operation.${operationName}.failure`, 1);
    monitoring.logError(error, { ...context, operationName, duration });
    
    throw error;
  }
}

export function wrapWithMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: Parameters<T>) => {
    return trackOperation(operationName, () => fn(...args));
  }) as T;
}
