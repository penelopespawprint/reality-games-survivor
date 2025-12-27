# Health Check API

## Overview

The RGFL API provides comprehensive health check endpoints for monitoring service health and diagnosing issues in production environments.

## Endpoints

### Simple Health Check

**Endpoint:** `GET /health`

**Purpose:** Lightweight endpoint for monitoring services (uptime monitors, load balancers, orchestration tools)

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-27T12:00:00.000Z"
}
```

**Status Code:** Always `200 OK` (unless server is completely down)

**Usage:**
- Uptime monitoring services (UptimeRobot, Pingdom, etc.)
- Load balancer health checks
- Kubernetes liveness probes
- Railway health checks

---

### Detailed Health Check

**Endpoint:** `GET /health?detailed=true`

**Purpose:** Comprehensive diagnostics for debugging and operational visibility

**Response Format:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-12-27T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "pass" | "warn" | "fail",
      "latency": 45,
      "details": {
        "message": "Database connection healthy"
      }
    },
    "scheduler": {
      "status": "pass" | "warn" | "fail",
      "running": true,
      "jobCount": 7,
      "details": {
        "message": "Scheduler running with 7 enabled jobs",
        "jobs": [
          {
            "name": "email-queue-processor",
            "schedule": "*/5 * * * *",
            "lastRun": "2025-12-27T11:55:00.000Z"
          }
          // ... more jobs
        ]
      }
    },
    "recentJobFailures": {
      "status": "pass" | "warn" | "fail",
      "count": 0,
      "lastFailure": {
        "timestamp": "2025-12-27T11:30:00.000Z",
        "job": "send-reminders",
        "error": "Failed to send email"
      }
    }
  }
}
```

**Status Codes:**
- `200 OK` - All checks pass or some warn
- `503 Service Unavailable` - One or more checks fail

**Usage:**
- Operations dashboard monitoring
- Debugging production issues
- Pre-deployment health verification
- Incident response diagnostics

---

## Health Check Components

### 1. Database Check

**Purpose:** Verify PostgreSQL connectivity and measure query performance

**Implementation:**
- Executes `SELECT id FROM users LIMIT 1`
- Measures query latency
- Handles "no rows" error gracefully

**Status Thresholds:**
- `pass` - Latency < 500ms
- `warn` - Latency 500ms - 2000ms
- `fail` - Latency >= 2000ms or connection error

**Example Responses:**

Success:
```json
{
  "status": "pass",
  "latency": 45,
  "details": {
    "message": "Database connection healthy"
  }
}
```

Warning:
```json
{
  "status": "warn",
  "latency": 850,
  "details": {
    "message": "Database responding slowly"
  }
}
```

Failure:
```json
{
  "status": "fail",
  "latency": 2500,
  "error": "Connection timeout"
}
```

---

### 2. Scheduler Check

**Purpose:** Verify job scheduler is running and jobs are scheduled

**Implementation:**
- Calls `getJobStatus()` from scheduler
- Verifies jobs are initialized
- Counts enabled jobs

**Status:**
- `pass` - Scheduler running with jobs
- `fail` - Scheduler not initialized or error

**Example Responses:**

Success:
```json
{
  "status": "pass",
  "running": true,
  "jobCount": 7,
  "details": {
    "message": "Scheduler running with 7 enabled jobs",
    "jobs": [
      {
        "name": "lock-picks",
        "schedule": "0 15 * * 3",
        "lastRun": "2025-12-20T15:00:00.000Z"
      }
    ]
  }
}
```

Failure:
```json
{
  "status": "fail",
  "running": false,
  "error": "Scheduler not initialized"
}
```

---

### 3. Recent Job Failures Check

**Purpose:** Monitor job execution health over the past hour

**Implementation:**
- Queries job monitoring system for failures in last 60 minutes
- Counts failures and retrieves most recent

**Status Thresholds:**
- `pass` - 0 failures
- `warn` - 1-3 failures
- `fail` - > 3 failures

**Example Responses:**

No failures:
```json
{
  "status": "pass",
  "count": 0
}
```

Warning:
```json
{
  "status": "warn",
  "count": 2,
  "lastFailure": {
    "timestamp": "2025-12-27T11:30:00.000Z",
    "job": "send-reminders",
    "error": "Failed to send email: Rate limit exceeded"
  }
}
```

Critical:
```json
{
  "status": "fail",
  "count": 5,
  "lastFailure": {
    "timestamp": "2025-12-27T11:45:00.000Z",
    "job": "email-queue-processor",
    "error": "SMTP connection refused"
  }
}
```

---

## Overall Status Logic

The overall health status is determined by aggregating all component checks:

```
Any component = FAIL    → Overall = "unhealthy"  (503)
Any component = WARN    → Overall = "degraded"   (200)
All components = PASS   → Overall = "healthy"    (200)
```

This ensures that:
- Critical failures trigger immediate alerts (503 status)
- Performance degradation is visible but non-critical (200 status)
- Full health is clearly indicated

---

## Integration Examples

### Uptime Monitoring

**UptimeRobot / Pingdom:**
```
URL: https://rgfl-api-production.up.railway.app/health
Expected: HTTP 200
Keyword: "ok"
Interval: 60 seconds
```

### Load Balancer Health Checks

**AWS ALB / nginx:**
```nginx
upstream api {
  server api1.example.com;
  server api2.example.com;
}

location /health {
  proxy_pass http://api/health;
  proxy_connect_timeout 2s;
  proxy_read_timeout 2s;
}
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 2

readinessProbe:
  httpGet:
    path: /health?detailed=true
    port: 3001
  initialDelaySeconds: 15
  periodSeconds: 30
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 3
```

### cURL Examples

Simple check:
```bash
curl https://rgfl-api-production.up.railway.app/health
```

Detailed check:
```bash
curl https://rgfl-api-production.up.railway.app/health?detailed=true | jq
```

Pretty-printed with headers:
```bash
curl -i https://rgfl-api-production.up.railway.app/health?detailed=true | jq
```

---

## Monitoring Best Practices

### 1. Use Simple Check for Uptime
- Fast response (< 10ms typically)
- Minimal load on server
- Clear binary status (up/down)

### 2. Use Detailed Check for Diagnostics
- Scheduled health audits (every 5-10 minutes)
- Incident investigation
- Pre-deployment verification
- Performance trend analysis

### 3. Alert Thresholds

**Critical Alerts (PagerDuty, Opsgenie):**
- Overall status = "unhealthy"
- HTTP 503 response
- Database check fails
- Scheduler check fails

**Warning Alerts (Email, Slack):**
- Overall status = "degraded"
- Database latency > 500ms
- Job failures > 3 in past hour

**Info Monitoring (Dashboard):**
- All checks visible
- Latency trends
- Job execution history

---

## Error Handling

The health check endpoint has comprehensive error handling:

1. **Database Connection Errors**
   - Caught and returned in `database.error` field
   - Status set to "fail"
   - Overall status becomes "unhealthy"

2. **Scheduler Errors**
   - Caught and returned in `scheduler.error` field
   - Status set to "fail" if not running
   - Overall status becomes "unhealthy"

3. **Job Monitoring System Errors**
   - Gracefully degrades to `count: 0` if system not implemented
   - Does not fail overall health check
   - Logs warning for investigation

4. **Health Check System Errors**
   - Returns 503 with error response
   - All checks marked as "fail"
   - Error logged for investigation

---

## Development Notes

### File Structure
```
server/src/
├── routes/health.ts           # Route handler
├── services/health.ts         # Health check logic
├── types/health.ts            # TypeScript types
├── lib/job-monitoring.ts      # Job monitoring interface
└── tests/health.test.ts       # Comprehensive tests
```

### Adding New Checks

To add a new health check component:

1. Add type to `types/health.ts`:
```typescript
export interface MyComponentCheck extends ComponentCheck {
  // Custom fields
  customField?: string;
}
```

2. Add check function to `services/health.ts`:
```typescript
async function checkMyComponent(): Promise<MyComponentCheck> {
  // Implementation
}
```

3. Add to `performHealthCheck()`:
```typescript
const [database, scheduler, myComponent] = await Promise.all([
  checkDatabase(),
  checkScheduler(),
  checkMyComponent(),
]);
```

4. Update overall status logic if needed

5. Add tests to `tests/health.test.ts`

---

## Troubleshooting

### Database Check Failing

**Symptom:** `database.status = "fail"`

**Possible Causes:**
- PostgreSQL service down
- Network connectivity issues
- Connection pool exhausted
- Invalid credentials

**Investigation:**
```bash
# Check database logs
npx supabase logs db

# Verify connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
# (implementation pending)
```

### Scheduler Check Failing

**Symptom:** `scheduler.status = "fail"` or `scheduler.running = false`

**Possible Causes:**
- `ENABLE_SCHEDULER=false` in environment
- Scheduler crashed on startup
- Cron validation errors

**Investigation:**
```bash
# Check server logs for scheduler startup
tail -f logs/server.log | grep -i scheduler

# Verify environment
echo $ENABLE_SCHEDULER

# Check job definitions
curl https://api.rgfl.app/health?detailed=true | jq '.checks.scheduler'
```

### Job Failures Increasing

**Symptom:** `recentJobFailures.count > 0` and growing

**Possible Causes:**
- Email service rate limiting
- Database query timeouts
- External API failures
- Invalid data in database

**Investigation:**
```bash
# Check most recent failure
curl https://api.rgfl.app/health?detailed=true | jq '.checks.recentJobFailures.lastFailure'

# Check job monitoring logs
# (implementation pending)

# Run job manually for debugging
# POST /api/admin/jobs/run { "job": "job-name" }
```

---

## Future Enhancements

1. **Job Monitoring Implementation**
   - Database table for job execution history
   - Query optimization for failure lookups
   - Retention policy for old logs

2. **Additional Checks**
   - Email service connectivity
   - SMS service (Twilio) status
   - Payment processing (Stripe) status
   - External API dependencies

3. **Performance Metrics**
   - Request rate tracking
   - Memory usage monitoring
   - CPU utilization
   - Connection pool metrics

4. **Historical Trending**
   - Store health check results over time
   - API for historical data
   - Dashboard visualization

---

## API Reference

### Types

See `/server/src/types/health.ts` for full TypeScript definitions:

- `HealthStatus`: 'pass' | 'warn' | 'fail'
- `OverallStatus`: 'healthy' | 'degraded' | 'unhealthy'
- `ComponentCheck`: Base interface for all checks
- `SchedulerCheck`: Scheduler-specific check
- `JobFailuresCheck`: Job failure check
- `DetailedHealthResponse`: Full response structure
- `SimpleHealthResponse`: Simple response structure

### Service Functions

See `/server/src/services/health.ts`:

- `performHealthCheck()`: Main entry point for detailed checks
- Returns `Promise<DetailedHealthResponse>`

---

## License

Part of the RGFL Survivor Fantasy League API
