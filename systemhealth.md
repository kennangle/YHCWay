# System Health Monitoring Guide

## Overview

The System Health monitoring system provides real-time visibility into the operational status of The YHC Way application. It tracks errors, service health, cache performance, and system metrics to help administrators identify and resolve issues quickly.

---

## What Was Added

### 1. Backend Monitoring Service (`server/monitoring.ts`)

A centralized monitoring service that tracks:

- **Error Logging**: Captures all application errors with severity levels (info, warn, error, critical)
- **Service Health**: Monitors the status of external services (Gmail, Slack, Zoom, etc.)
- **Metrics Recording**: Tracks operation durations and success/failure rates
- **Consecutive Failure Detection**: Automatically escalates to critical when a service fails 3+ times in a row

### 2. Admin API Endpoints

Two new endpoints accessible only to administrators:

**GET /api/admin/system-health**
Returns:
- `status`: Overall system status ("operational", "degraded", "down")
- `timestamp`: When the health check was performed
- `errors`: Error statistics (total, critical, recent rate)
- `cache`: Cache utilization (current size, max size)
- `services`: Array of service health statuses

**GET /api/admin/error-logs**
Returns:
- `logs`: Array of recent error entries with severity, message, service, and timestamp

### 3. System Health Dashboard (`/system-health`)

A visual dashboard accessible from **Operations > System Health** in the navigation sidebar (admin only).

**Dashboard Cards:**
- **Overall Status**: Shows if the system is operational, degraded, or down
- **Recent Errors**: Count of errors in the last 5 minutes
- **Cache**: Current cached items vs. maximum capacity
- **Total Errors**: Cumulative error count since startup

**Service Status Table:**
Lists all monitored services with:
- Service name
- Current status (healthy, degraded, unhealthy)
- Response time in milliseconds
- Error messages (if any)

**Error Logs Panel:**
Shows the 10 most recent errors with:
- Severity badge (info, warn, error, critical)
- Service name
- Error message
- Timestamp

### 4. Cache Integration

The caching system now reports statistics to System Health:
- Current number of cached items
- Maximum cache capacity (1000 items)
- Cache invalidation is tracked for Gmail operations

---

## How It Works

### Error Tracking Flow

1. When an error occurs anywhere in the application, it's logged via `monitoring.logError()`
2. The error is stored in memory with its severity, timestamp, and context
3. Only the most recent 1000 errors are kept (older entries are automatically removed)
4. Critical errors trigger immediate logging to the console

### Service Health Tracking

1. External service calls (Gmail, Slack, etc.) update their health status after each request
2. Successful calls mark the service as "healthy" with response time
3. Failed calls increment the consecutive failure counter
4. After 3 consecutive failures, the service is marked as "critical" and logged

### Cache Monitoring

1. The in-memory cache automatically tracks its size
2. When capacity is reached (1000 items), oldest entries are evicted
3. Expired entries are cleaned up every 60 seconds
4. Cache statistics are reported in real-time to the dashboard

---

## Best Practices

### Daily Monitoring Routine

**Morning Check (Start of Day)**
1. Navigate to **Operations > System Health**
2. Verify overall status shows "Operational"
3. Check that all services show "Healthy"
4. Review any overnight errors in the Error Logs panel

**Recommended Frequency**: Once at the start of each workday

### When to Check System Health

| Situation | Action |
|-----------|--------|
| User reports slow performance | Check cache utilization and service response times |
| External service not working | Check Service Status for that specific service |
| Unexpected errors appearing | Review Error Logs for patterns |
| After deploying changes | Verify all services remain healthy |
| Before important meetings/demos | Quick status check to ensure system is operational |

### Interpreting Status Indicators

**Overall Status:**
- **Operational** (Green): Everything is working normally
- **Degraded** (Yellow): Some services may be slow or have minor issues
- **Down** (Red): Critical services are unavailable

**Service Status:**
- **Healthy** (Green): Service responding normally
- **Degraded** (Yellow): Service responding but slower than usual
- **Unhealthy** (Red): Service failing or not responding

**Error Severity:**
- **Info** (Blue): Informational messages, no action needed
- **Warn** (Yellow): Potential issues, monitor closely
- **Error** (Red): Something failed, investigate soon
- **Critical** (Purple): Immediate attention required

### Responding to Issues

**High Error Rate (>5 errors in 5 minutes)**
1. Check Error Logs for common patterns
2. Identify which service is causing errors
3. If it's an external service (Gmail, Slack), check if the service itself is down
4. Consider temporarily disabling the problematic integration

**Service Marked as Unhealthy**
1. Check the service's last error message
2. Verify credentials are still valid in **Settings > Connect App**
3. Try disconnecting and reconnecting the service
4. If persistent, check the external service's status page

**Cache at Capacity**
1. This is normal behavior - the cache self-manages
2. If cache is frequently full, consider which operations could benefit from longer TTL
3. No user action typically required

### Weekly Review

**Every Monday (or weekly team meeting)**
1. Review total error count for the week
2. Identify any services with recurring issues
3. Note any patterns in error timing (e.g., always fails at 9am)
4. Plan any needed maintenance or reconnections

---

## Understanding the Metrics

### Error Statistics

| Metric | Description | Normal Range |
|--------|-------------|--------------|
| Total Errors | All errors since server start | Varies by usage |
| Critical Errors | Severe issues requiring attention | Should be 0 |
| Recent Error Rate | Errors in last 5 minutes | < 5 is healthy |

### Cache Statistics

| Metric | Description | Normal Range |
|--------|-------------|--------------|
| Size | Current cached items | 0-1000 |
| Max Size | Maximum capacity | 1000 (fixed) |

### Service Response Times

| Service | Expected Response Time |
|---------|----------------------|
| Gmail | < 500ms |
| Slack | < 300ms |
| Google Calendar | < 400ms |
| Database | < 50ms |

---

## Troubleshooting Common Issues

### "No service data available"

This means no external services have been called yet since the server started. Normal after a fresh restart - services will appear as they're used.

### Error Log shows "Insufficient Permission"

The connected service needs to be reconnected with updated permissions:
1. Go to **Settings > Connect App**
2. Disconnect the affected service
3. Reconnect and grant all requested permissions

### High consecutive failures on a service

The external service may be experiencing an outage:
1. Check the service's official status page
2. Wait 15-30 minutes and check again
3. If persistent, try reconnecting the service

### Cache always at 0

This is normal if:
- The server just started
- No cacheable operations have been performed
- Cache was recently cleared

---

## Technical Details for Developers

### Adding New Service Health Tracking

To track a new service:

```typescript
import { monitoring } from "./monitoring";

// After a successful API call
monitoring.updateServiceHealth("ServiceName", "healthy", responseTimeMs);

// After a failed API call
monitoring.updateServiceHealth("ServiceName", "unhealthy", responseTimeMs, error.message);
```

### Logging Custom Errors

```typescript
import { monitoring } from "./monitoring";

// Log with context
monitoring.logError(error, { userId, service: "ServiceName" }, "error");

// Log informational messages
monitoring.logInfo("Operation completed", { details: "..." });

// Log warnings
monitoring.logWarn("Approaching rate limit", { remaining: 5 });
```

### Cache Key Patterns

Gmail labels: `gmail:labels:{userId}:{accountId}`
Gmail messages: `gmail:messages:{userId}:{accountId}:{filter}`
Calendar events: `calendar:events:{userId}:{start}:{end}`
User preferences: `user:preferences:{userId}`

---

## Summary

The System Health monitoring system is your window into the application's operational status. By checking it regularly (daily at minimum) and responding promptly to issues, you can ensure The YHC Way remains reliable and performant for all users.

**Key Takeaways:**
1. Check System Health daily, especially at the start of your workday
2. Green = good, Yellow = monitor, Red = take action
3. Most issues can be resolved by reconnecting the affected service
4. The system self-manages cache and error log size automatically
5. Use the Error Logs to identify patterns and recurring issues
