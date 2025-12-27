# Release Results Job - Implementation Summary

## Overview

Created a new scheduled job that runs **Friday at 2:00 PM PST** to send spoiler-safe notifications about episode results to players.

## Files Created

### 1. `/server/src/jobs/releaseResults.ts`

Main job handler that:
- Queries for the latest finalized episode (has `scoring_finalized_at`, no `results_released_at`)
- Fetches users with results notification preferences enabled
- Sends spoiler-safe notifications via email/SMS
- Marks episode as released after completion
- Returns stats: episode processed, notifications sent, errors

Key functions:
- `getLatestFinalizedEpisode()` - Finds episode ready for release
- `getUsersWithResultsNotifications()` - Gets users with email_results or sms_results enabled
- `markResultsReleased()` - Updates episode with results_released_at timestamp
- `releaseWeeklyResults()` - Main job function (exported)

## Files Modified

### 2. `/server/src/jobs/scheduler.ts`

Added job to scheduler:
```typescript
{
  name: 'release-results',
  schedule: pstToCron(14, 0, 5), // Fri 2pm PST (auto-adjusts for DST)
  description: 'Release spoiler-safe results notifications',
  handler: releaseWeeklyResults,
  enabled: true,
}
```

### 3. `/server/src/jobs/index.ts`

Exported the new job:
```typescript
export { releaseWeeklyResults } from './releaseResults.js';
```

### 4. `/server/src/jobs/jobAlerting.ts`

Added to critical jobs list:
```typescript
const CRITICAL_JOBS = new Set([
  'lock-picks',
  'auto-pick',
  'draft-finalize',
  'release-results', // New
]);
```

Updated alert descriptions to include release-results in critical job documentation.

## Dependencies

### Existing Services (Already Implemented)
✅ `/server/src/lib/spoiler-safe-notifications.ts` - Sends email/SMS without spoilers
✅ `/server/src/lib/email-queue.ts` - Email delivery queue
✅ `/server/src/config/twilio.ts` - SMS sending
✅ `/server/src/jobs/jobMonitor.ts` - Job monitoring wrapper
✅ `/server/src/lib/timezone-utils.ts` - PST/PDT timezone handling

### Database Dependencies (Need to be Created by Other Agents)

**Required columns on `episodes` table:**
- `scoring_finalized_at` (timestamptz, nullable) - Set when admin finalizes scoring
- `results_released_at` (timestamptz, nullable) - Set by this job when results released
- `week_number` (int) - Episode week number for display

**Required tables:**
- `notification_preferences` - User notification settings
  - `user_id` (uuid, FK to users.id)
  - `email_results` (boolean)
  - `sms_results` (boolean)
  - `push_results` (boolean)

- `results_tokens` - Secure tokens for results access
  - `token` (text, unique)
  - `user_id` (uuid, FK to users.id)
  - `episode_id` (uuid, FK to episodes.id)
  - `expires_at` (timestamptz)
  - `used_at` (timestamptz, nullable)

**Fallback:** If `notification_preferences` table doesn't exist, the spoiler-safe service will fall back to `users.notification_email` and `users.notification_sms` columns (already exist).

## Job Schedule

| Job Name | Day | Time | Description |
|----------|-----|------|-------------|
| `release-results` | Friday | 2:00 PM PST | Sends spoiler-safe results notifications |

Timezone handling: Uses `pstToCron()` helper to auto-adjust for PST/PDT transitions.

## Monitoring & Alerting

- **Wrapped with:** `monitoredJobExecution()` - Automatic tracking, logging, error handling
- **Alert Level:** CRITICAL - Sends SMS + email alerts on failure
- **Job History:** Available via `/api/admin/jobs/history?jobName=release-results`
- **Manual Trigger:** Available via `/api/admin/jobs/run?jobName=release-results`

## Admin Manual Override

Admin can manually trigger results release:
```bash
# Manual job trigger
POST /api/admin/jobs/run?jobName=release-results

# Future: Per-episode release endpoint (created by another agent)
POST /api/admin/episodes/:id/release-results
```

## Error Handling

The job is designed to be resilient:
- **Database errors:** Logs error, returns null episode, job completes gracefully
- **User lookup errors:** Logs error, returns empty array, job completes gracefully
- **Individual notification failures:** Catches error, increments error counter, continues to next user
- **Token generation failures:** Propagates error, tracked as notification failure
- **Mark as released failures:** Logs error but doesn't fail job (can be retried)

## Testing Checklist

- [x] TypeScript compilation successful
- [ ] Job scheduled correctly (verify cron expression)
- [ ] Only processes episodes with `scoring_finalized_at` set
- [ ] Doesn't re-process episodes with `results_released_at` set
- [ ] Sends notifications only to users with preferences enabled
- [ ] Creates results tokens for each notification
- [ ] Marks episode as released after completion
- [ ] Error handling continues processing on individual failures
- [ ] Job monitoring tracks execution stats
- [ ] Critical alert sent on job failure

## Integration with Existing Jobs

### Timeline View (Friday)
```
12:00 PM PST → results-notification (existing job, sends episode results)
 2:00 PM PST → release-results (NEW - sends spoiler-safe notifications)
```

**Key Difference:**
- `results-notification`: Legacy job, sends full results immediately (may have spoilers)
- `release-results`: New job, sends spoiler-safe notifications with click-to-reveal

## Deployment Checklist

Before deploying this job:

1. **Database migrations** (by database agent):
   - [ ] Add `episodes.scoring_finalized_at` column
   - [ ] Add `episodes.results_released_at` column
   - [ ] Add `episodes.week_number` column
   - [ ] Create `notification_preferences` table
   - [ ] Create `results_tokens` table

2. **Admin endpoints** (by API agent):
   - [ ] Create `/api/admin/episodes/:id/release-results` endpoint
   - [ ] Update admin dashboard to show results release status

3. **Frontend** (by web agent):
   - [ ] Create `/results/episode-:number` page with token verification
   - [ ] Add notification preferences UI

4. **Environment variables:**
   - [x] `APP_URL` - Already set
   - [x] `ADMIN_EMAIL` - For failure alerts
   - [x] `ADMIN_PHONE` - For critical failure SMS

## Manual Testing

```bash
# 1. Test job manually
curl -X POST http://localhost:3001/api/admin/jobs/run?jobName=release-results \
  -H "Authorization: Bearer <admin-token>"

# 2. Check job history
curl http://localhost:3001/api/admin/jobs/history?jobName=release-results \
  -H "Authorization: Bearer <admin-token>"

# 3. Check job stats
curl http://localhost:3001/api/admin/jobs/stats?jobName=release-results \
  -H "Authorization: Bearer <admin-token>"
```

## Production Verification

After deployment, verify:
1. Job appears in scheduler status: `GET /api/admin/jobs/status`
2. Cron schedule is correct: `0 14 * * 5` in UTC (2pm PST Friday)
3. First run processes latest finalized episode
4. Notifications sent successfully (check email queue)
5. Episode marked with `results_released_at` timestamp
6. No errors in job monitoring history

## Notes

- **Idempotent:** Job can be run multiple times safely (checks `results_released_at`)
- **Timezone-aware:** Automatically adjusts for PST/PDT transitions
- **Fail-safe:** Individual notification failures don't fail entire job
- **Observable:** Full monitoring, alerting, and history tracking
- **Secure:** Results tokens expire after 7 days
- **Spoiler-safe:** No episode details in email subject/SMS content
