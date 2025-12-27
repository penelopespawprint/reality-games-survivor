# Job Monitoring System

## Overview

The job monitoring system tracks execution history for all scheduled jobs in the Survivor Fantasy League backend. It provides production-grade observability into job health, performance, and failure patterns without requiring external logging infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Job Scheduler                          │
│  (scheduler.ts)                                          │
│                                                          │
│  ┌────────────────────────────────────────┐            │
│  │  Cron Jobs (7 recurring jobs)          │            │
│  │  • email-queue-processor (every 5 min) │            │
│  │  • lock-picks (Wed 3pm PST)            │◄───────┐   │
│  │  • auto-pick (Wed 3:05pm PST)          │        │   │
│  │  • pick-reminders (Wed 12pm PST)       │        │   │
│  │  • results-notification (Fri 12pm)     │        │   │
│  │  • weekly-summary (Sun 10am PST)       │        │   │
│  │  • draft-reminders (Daily 9am PST)     │        │   │
│  └────────────────────────────────────────┘        │   │
│                                                     │   │
│  ┌────────────────────────────────────────┐        │   │
│  │  One-Time Jobs                         │        │   │
│  │  • auto-randomize-rankings (Jan 5)     │        │   │
│  │  • draft-finalize (Mar 2)              │        │   │
│  └────────────────────────────────────────┘        │   │
└─────────────────────────────────────────────────────┘   │
                        │                                  │
                        │ Wraps all handlers               │
                        ▼                                  │
        ┌───────────────────────────────┐                 │
        │   monitoredJobExecution()     │                 │
        │   (jobMonitor.ts)             │                 │
        │                               │                 │
        │  Tracks:                      │                 │
        │  • Start/end time             │                 │
        │  • Duration (ms)              │                 │
        │  • Success/failure            │                 │
        │  • Error messages             │                 │
        │  • Result data                │                 │
        └───────────────┬───────────────┘                 │
                        │                                  │
                        │ Stores in circular buffer        │
                        ▼                                  │
        ┌───────────────────────────────┐                 │
        │   Execution History           │                 │
        │   (In-memory, last 100 runs)  │                 │
        │                               │                 │
        │  JobExecution[] = [           │                 │
        │    {                          │                 │
        │      jobName,                 │                 │
        │      startTime,               │                 │
        │      endTime,                 │                 │
        │      durationMs,              │                 │
        │      success,                 │                 │
        │      error?,                  │                 │
        │      result?                  │                 │
        │    },                         │                 │
        │    ...                        │                 │
        │  ]                            │                 │
        └───────────────┬───────────────┘                 │
                        │                                  │
                        │ Query via API                    │
                        ▼                                  │
        ┌───────────────────────────────┐                 │
        │  GET /api/admin/jobs/history  │─────────────────┘
        │  (admin.ts)                   │
        │                               │
        │  Returns:                     │
        │  • Execution history          │
        │  • Per-job statistics         │
        │  • Success rates              │
        │  • Recent failures            │
        └───────────────────────────────┘
```

## Core Components

### 1. Job Monitor (`server/src/jobs/jobMonitor.ts`)

**`monitoredJobExecution(jobName, handler)`**
- Wraps any async job handler
- Records start time, end time, duration
- Captures success/failure status
- Stores error messages on failure
- Maintains circular buffer of last 100 executions
- Re-throws errors to preserve existing error handling

**`getJobHistory(limit?, jobName?)`**
- Returns recent job executions (most recent first)
- Optional filtering by job name
- Optional limit (default: 100)

**`getJobStats(jobName?)`**
- Returns statistics:
  - Total executions
  - Success/failure counts
  - Success rate percentage
  - Average duration (ms)
  - Last execution details
  - Recent failures (last 10)

**`getTrackedJobs()`**
- Returns array of all job names in history
- Useful for building dashboards

### 2. Scheduler Integration (`server/src/jobs/scheduler.ts`)

All job executions are wrapped with `monitoredJobExecution()`:

**Cron Jobs:**
```typescript
cron.schedule(job.schedule, async () => {
  const result = await monitoredJobExecution(job.name, job.handler);
  // ... existing logging
});
```

**Manual Execution:**
```typescript
export async function runJob(jobName: string) {
  return monitoredJobExecution(jobName, handler);
}
```

**One-Time Jobs:**
```typescript
setTimeout(async () => {
  await monitoredJobExecution('draft-finalize', finalizeDrafts);
}, delay);
```

### 3. Admin API (`server/src/routes/admin.ts`)

**GET /api/admin/jobs/history**

Returns comprehensive job monitoring data.

**Query Parameters:**
- `limit` - Max executions to return (default: 100)
- `jobName` - Filter by specific job (optional)

**Response:**
```json
{
  "history": [
    {
      "jobName": "email-queue-processor",
      "startTime": "2026-02-20T15:05:00.000Z",
      "endTime": "2026-02-20T15:05:02.342Z",
      "durationMs": 2342,
      "success": true,
      "result": {
        "processed": 5,
        "failed": 0
      }
    },
    {
      "jobName": "lock-picks",
      "startTime": "2026-02-19T23:00:00.000Z",
      "endTime": "2026-02-19T23:00:01.123Z",
      "durationMs": 1123,
      "success": false,
      "error": "Database connection timeout"
    }
  ],
  "stats": [
    {
      "jobName": "email-queue-processor",
      "totalExecutions": 48,
      "successCount": 47,
      "failureCount": 1,
      "successRate": 97.92,
      "averageDurationMs": 2150,
      "lastExecution": { /* ... */ },
      "recentFailures": [ /* ... */ ]
    }
  ],
  "totalExecutions": 100
}
```

**Authentication:**
- Requires admin role
- Uses existing `authenticate` and `requireAdmin` middleware

## Usage Examples

### View All Job History

```bash
curl -H "Authorization: Bearer <admin_token>" \
  https://rgfl-api-production.up.railway.app/api/admin/jobs/history
```

### View Specific Job History

```bash
curl -H "Authorization: Bearer <admin_token>" \
  "https://rgfl-api-production.up.railway.app/api/admin/jobs/history?jobName=email-queue-processor&limit=50"
```

### Programmatic Access

```typescript
import { getJobHistory, getJobStats } from '../jobs/index.js';

// Get last 10 executions of lock-picks job
const history = getJobHistory(10, 'lock-picks');

// Get statistics for email-queue-processor
const stats = getJobStats('email-queue-processor');

console.log(`Success rate: ${stats.successRate}%`);
console.log(`Average duration: ${stats.averageDurationMs}ms`);
console.log(`Recent failures: ${stats.recentFailures.length}`);
```

## Monitored Jobs

### Recurring Jobs (Cron)

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `email-queue-processor` | Every 5 minutes | Process pending emails with retry logic |
| `lock-picks` | Wed 3pm PST | Lock all pending weekly picks |
| `auto-pick` | Wed 3:05pm PST | Auto-select for missing picks |
| `pick-reminders` | Wed 12pm PST | Send pick reminder emails |
| `results-notification` | Fri 12pm PST | Send episode results |
| `weekly-summary` | Sun 10am PST | Send weekly standings summary |
| `draft-reminders` | Daily 9am PST | Send draft reminder emails |

### One-Time Jobs

| Job Name | Trigger | Description |
|----------|---------|-------------|
| `auto-randomize-rankings` | Jan 5, 2026 12pm PST | Auto-generate draft rankings |
| `draft-finalize` | Mar 2, 2026 8pm PST | Auto-complete drafts |

## Operational Patterns

### Alert on Repeated Failures

```typescript
const stats = getJobStats('lock-picks');

if (stats.failureCount >= 3 && stats.successRate < 50) {
  // Alert operations team
  console.error('CRITICAL: lock-picks job failing repeatedly');
  // Future: Send alert via email/SMS
}
```

### Performance Degradation Detection

```typescript
const history = getJobHistory(10, 'email-queue-processor');

const recentDurations = history
  .filter(h => h.durationMs)
  .map(h => h.durationMs);

const avgRecent = recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length;
const stats = getJobStats('email-queue-processor');

if (avgRecent > stats.averageDurationMs! * 2) {
  console.warn('WARNING: email-queue-processor running 2x slower than average');
  // Future: Send performance alert
}
```

### Error Pattern Analysis

```typescript
const stats = getJobStats('auto-pick');

// Get error messages from recent failures
const errorPatterns = stats.recentFailures.map(f => f.error);

// Check for specific error types
const dbErrors = errorPatterns.filter(e => e?.includes('Database'));
const timeoutErrors = errorPatterns.filter(e => e?.includes('timeout'));

console.log(`Database errors: ${dbErrors.length}`);
console.log(`Timeout errors: ${timeoutErrors.length}`);
```

## Design Decisions

### Why In-Memory Circular Buffer?

**Pros:**
- Zero external dependencies
- No database writes on every job execution
- Fast access to recent history
- Simple implementation
- No cleanup/maintenance required

**Cons:**
- Data lost on server restart
- Limited to 100 executions
- Not queryable across restarts
- Can't track long-term trends

**Trade-off:** For operational monitoring and immediate alerting, in-memory storage provides sufficient visibility. For long-term analytics, consider adding database persistence in Phase 2.

### Why 100 Executions?

- Covers ~8.5 hours of email-queue-processor (every 5 min)
- Covers 14+ weeks of weekly jobs
- Lightweight memory footprint (~50KB)
- Sufficient for detecting patterns/failures
- Can be increased if needed

### Timezone Handling

The monitoring system is timezone-agnostic. All timestamps are stored as JavaScript `Date` objects (UTC internally), allowing flexible display in any timezone.

The existing `timezone-utils.ts` handles PST/PDT conversion for cron schedules, which is preserved by the monitoring wrapper.

## Future Enhancements (Not in Phase 1)

1. **Database Persistence**
   - Store execution history in `job_executions` table
   - Enable long-term trend analysis
   - Survive server restarts

2. **Alerting Integration**
   - Email alerts on repeated failures
   - SMS alerts for critical jobs
   - PagerDuty integration for on-call

3. **Dashboard UI**
   - Web dashboard for job health
   - Success rate charts
   - Duration trend graphs
   - Real-time job status

4. **Advanced Metrics**
   - P50/P95/P99 duration percentiles
   - Error rate trends
   - Job dependency tracking
   - Resource usage metrics

5. **Anomaly Detection**
   - Statistical outlier detection
   - Automatic threshold tuning
   - Predictive failure alerts

## Testing

### Manual Testing

```bash
# Build the server
cd server && npm run build

# Run a job manually (triggers monitoring)
curl -X POST -H "Authorization: Bearer <admin_token>" \
  https://rgfl-api-production.up.railway.app/api/admin/jobs/email-queue-processor/run

# Check execution history
curl -H "Authorization: Bearer <admin_token>" \
  https://rgfl-api-production.up.railway.app/api/admin/jobs/history
```

### Simulating Failures

```typescript
// Temporarily modify a job to throw errors
export async function testJob() {
  throw new Error('Simulated failure for testing');
}

// Run it multiple times
await runJob('test-job');
await runJob('test-job');
await runJob('test-job');

// Check failure stats
const stats = getJobStats('test-job');
console.log(stats.recentFailures);
```

## Maintenance

### Clearing History

```typescript
import { clearJobHistory } from '../jobs/index.js';

// Clear all execution history (e.g., after debugging)
clearJobHistory();
```

### Monitoring the Monitor

The monitoring system itself is lightweight and requires no maintenance. However, you should periodically check:

1. **Memory usage** - 100 executions ~50KB, very lightweight
2. **History coverage** - Ensure 100 executions covers your needs
3. **Error noise** - Review if error messages are actionable

## Related Documentation

- [Email Queue System](./EMAIL_QUEUE.md) - Email retry logic and dead letter queue
- [Timezone Utilities](../src/lib/timezone-utils.ts) - PST/PDT handling for schedules
- [Admin API](../src/routes/admin.ts) - All admin endpoints
- [Job Scheduler](../src/jobs/scheduler.ts) - Cron job configuration

## Support

For questions or issues with the job monitoring system:

1. Check execution history via API
2. Review console logs for job output
3. Inspect error messages in recent failures
4. Check database for related tables (email_jobs, failed_emails)
