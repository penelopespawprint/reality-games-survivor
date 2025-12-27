# Job Monitoring - Quick Reference

## API Endpoint

```
GET /api/admin/jobs/history
```

**Authentication:** Requires admin role

**Query Parameters:**
- `limit` - Max executions to return (default: 100)
- `jobName` - Filter by specific job (optional)

## Usage Examples

### View All Job History
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://rgfl-api-production.up.railway.app/api/admin/jobs/history
```

### View Specific Job (Last 50 Executions)
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://rgfl-api-production.up.railway.app/api/admin/jobs/history?jobName=email-queue-processor&limit=50"
```

### Pretty Print JSON
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://rgfl-api-production.up.railway.app/api/admin/jobs/history | jq
```

## Response Structure

```json
{
  "history": [
    {
      "jobName": "email-queue-processor",
      "startTime": "2026-02-20T15:05:00.000Z",
      "endTime": "2026-02-20T15:05:02.342Z",
      "durationMs": 2342,
      "success": true,
      "result": { "processed": 5, "failed": 0 }
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
      "recentFailures": [ /* last 10 failures */ ]
    }
  ],
  "totalExecutions": 100
}
```

## Monitored Jobs

| Job Name | Schedule | Critical? |
|----------|----------|-----------|
| email-queue-processor | Every 5 min | Yes (email delivery) |
| lock-picks | Wed 3pm PST | **Critical** (gameplay) |
| auto-pick | Wed 3:05pm PST | **Critical** (gameplay) |
| pick-reminders | Wed 12pm PST | No (notifications) |
| results-notification | Fri 12pm PST | No (notifications) |
| weekly-summary | Sun 10am PST | No (notifications) |
| draft-reminders | Daily 9am PST | No (notifications) |
| auto-randomize-rankings | One-time: Jan 5 | Yes (draft setup) |
| draft-finalize | One-time: Mar 2 | **Critical** (draft) |

## Alert Thresholds

### Critical Jobs (Immediate Action Required)
- **lock-picks** - Any failure during season
- **auto-pick** - Any failure during season
- **draft-finalize** - Any failure

### Important Jobs (Monitor Closely)
- **email-queue-processor** - Failure rate > 5%
- **auto-randomize-rankings** - Any failure

### Non-Critical Jobs
- Notification jobs - Failure rate > 20%

## Common Operations

### Check Job Health
```bash
# Get stats for critical jobs
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://rgfl-api-production.up.railway.app/api/admin/jobs/history?jobName=lock-picks" \
  | jq '.stats[0]'
```

### Find Recent Failures
```bash
# Show last 10 failed executions
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://rgfl-api-production.up.railway.app/api/admin/jobs/history \
  | jq '.history[] | select(.success == false) | {jobName, startTime, error}'
```

### Check Performance Degradation
```bash
# Compare recent vs average duration
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://rgfl-api-production.up.railway.app/api/admin/jobs/history?jobName=email-queue-processor" \
  | jq '{
      avgDuration: .stats[0].averageDurationMs,
      recentDurations: [.history[0:5][] | .durationMs]
    }'
```

### List All Tracked Jobs
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://rgfl-api-production.up.railway.app/api/admin/jobs/history \
  | jq '.stats[].jobName'
```

## Manual Job Execution

### Trigger Job Manually
```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://rgfl-api-production.up.railway.app/api/admin/jobs/email-queue-processor/run
```

**Note:** Manual executions are also tracked in monitoring history.

## Troubleshooting

### Job Not Appearing in History
- Job hasn't run yet (check schedule)
- Server restarted (history cleared)
- Job disabled in scheduler
- Check server logs for errors

### Success Rate Suddenly Drops
1. Check recent failures for error messages
2. Review server logs around failure times
3. Check external service status (DB, email, etc.)
4. Review recent code deployments

### High Average Duration
1. Check database performance
2. Review email queue size
3. Check for API rate limiting
4. Look for N+1 query patterns

### Missing Executions
- Circular buffer limit (100 executions)
- Older executions rotated out
- Expected for jobs that run frequently

## Emergency Procedures

### Critical Job Failing Repeatedly

1. **Immediate:**
   ```bash
   # Check error messages
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "https://rgfl-api-production.up.railway.app/api/admin/jobs/history?jobName=lock-picks" \
     | jq '.stats[0].recentFailures'
   ```

2. **Investigate:**
   - Review server logs
   - Check database connectivity
   - Verify external service status

3. **Manual Intervention:**
   ```bash
   # Try manual execution
   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://rgfl-api-production.up.railway.app/api/admin/jobs/lock-picks/run
   ```

4. **Escalate:**
   - If manual execution fails, fix underlying issue
   - If players affected, communicate via social media

### Email Queue Backing Up

```bash
# Check email queue stats
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://rgfl-api-production.up.railway.app/api/admin/email-queue/stats

# Check email-queue-processor performance
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://rgfl-api-production.up.railway.app/api/admin/jobs/history?jobName=email-queue-processor" \
  | jq '.stats[0]'
```

## Limitations

- **History cleared on restart** - In-memory only
- **100 execution limit** - Circular buffer
- **No long-term trends** - Use logs for historical analysis
- **No alerting** - Manual monitoring required (for now)

## See Also

- Full Documentation: `server/docs/JOB_MONITORING.md`
- Implementation Guide: `server/docs/MONITORING_IMPLEMENTATION.md`
- Demo Script: `npx tsx server/src/examples/job-monitoring-demo.ts`

---

**Quick Support:**
- Check this reference first
- Review full docs for deeper understanding
- Run demo script to see examples
- Check server logs for detailed execution info
