# QA Report: Job Failure Email Alerting System
**Test Charter:** Verify job failure email alerting delivers actionable debugging information to admin
**Tester:** Exploratory QA Agent
**Date:** December 27, 2025
**Environment:** Production codebase, server not running (static analysis)
**Status:** 🔴 **CRITICAL BUGS FOUND** - System has fatal flaw preventing deployment

---

## Executive Summary

The job failure email alerting system has a **well-designed architecture** with comprehensive error tracking, but contains **1 BLOCKING BUG** and **4 HIGH-PRIORITY ISSUES** that would prevent successful operation in production. While code quality is good, configuration gaps and missing error handling will cause silent failures.

### Severity Breakdown
- **P0 BLOCKING:** 1 bug (missing database field prevents spoiler-safe notifications)
- **P1 HIGH:** 4 issues (configuration, error handling, testing gaps)
- **P2 MEDIUM:** 2 improvements (email content, monitoring)

---

## Test Scope

### What Was Tested
1. ✅ Alert system initialization and configuration
2. ✅ Email alert content and structure
3. ✅ Critical vs normal job failure differentiation
4. ✅ SMS alert logic for critical jobs
5. ✅ Test alert endpoint implementation
6. ✅ Integration with job monitoring system
7. ✅ Error handling and fallback behavior

### What Was NOT Tested (Blocked)
- ❌ End-to-end alert delivery (server not running)
- ❌ Actual email/SMS receipt verification
- ❌ Load testing with multiple simultaneous failures
- ❌ Alert deduplication behavior

---

## BLOCKING BUGS (P0)

### BUG #1: Missing `week_number` Field Breaks Spoiler-Safe Notifications 🔥

**Severity:** P0 - BLOCKING
**Impact:** 100% failure rate for spoiler-safe result notifications, blocks alert testing

**Location:**
- `/server/src/lib/spoiler-safe-notifications.ts:112` (email HTML)
- `/server/src/lib/spoiler-safe-notifications.ts:181` (email text)

**Root Cause:**
Code references `episode.week_number` which doesn't exist in Episode interface or database schema.

**Evidence:**
```typescript
// Line 112 - spoiler-safe-notifications.ts
const resultsUrl = `${appUrl}/results/week-${episode.week_number}?token=${token}`;
//                                              ^^^^^^^^^^^^^ - UNDEFINED

// Episode interface only has:
interface Episode {
  id: string;
  number: number;  // ❌ NOT week_number
  season_id: string;
}
```

**Impact Chain:**
1. `sendSpoilerSafeNotification()` is called after job failure → success
2. Email is queued with URL containing `undefined` → `/results/week-undefined?token=...`
3. Users click broken link → 404 error
4. Users never see results → complete system failure
5. No error logged (field simply returns undefined in JavaScript)

**This is the SAME bug found in QA Report: Weekly Picks Security** - it affects multiple critical systems!

**Fix Required:**
```sql
-- Option 1: Add week_number column
ALTER TABLE episodes ADD COLUMN week_number INTEGER;
UPDATE episodes SET week_number = number; -- Assuming 1:1 mapping

-- Option 2: Change code to use episode.number
const resultsUrl = `${appUrl}/results/week-${episode.number}?token=${token}`;
```

**Priority:** MUST FIX BEFORE LAUNCH - Blocks result release job and all spoiler-safe notifications

---

## HIGH PRIORITY ISSUES (P1)

### ISSUE #1: No Environment Variable Validation

**Severity:** P1 - HIGH
**Impact:** Silent failures, no admin alerts sent

**Problem:**
Admin email/phone are required for alerting but have no validation or startup checks.

**Evidence:**
```typescript
// jobAlerting.ts:32-46
export function initializeAlerting(options: AlertConfig): void {
  config = {
    adminEmail: options.adminEmail || process.env.ADMIN_EMAIL,
    adminPhone: options.adminPhone || process.env.ADMIN_PHONE,
  };

  if (!config.adminEmail) {
    console.warn('[Job Alerting] ADMIN_EMAIL not configured - email alerts disabled');
    // ⚠️ Only a warning! System continues with alerts DISABLED
  }
}
```

**Server startup log shows:**
```typescript
// server.ts:239-242
initializeAlerting({
  adminEmail: process.env.ADMIN_EMAIL,
  adminPhone: process.env.ADMIN_PHONE,
});
// ⚠️ No validation that these are actually set!
```

**Current State (from .env.example):**
```bash
ADMIN_EMAIL=admin@realitygamesfantasyleague.com  # ✅ Set in example
ADMIN_PHONE=  # ❌ NOT SET - SMS alerts completely disabled
```

**Consequence:**
- Job failures occur → Alerting system silently skips email/SMS
- Admin never knows system is failing
- Production outages go undetected

**Fix:**
```typescript
if (!config.adminEmail) {
  throw new Error('ADMIN_EMAIL is required for job monitoring - set in environment');
}
if (!config.adminPhone) {
  console.warn('[Job Alerting] ADMIN_PHONE not set - SMS alerts disabled for critical jobs');
}
```

---

### ISSUE #2: Test Alert Endpoint Not Tested

**Severity:** P1 - HIGH
**Impact:** Cannot verify alerting works before production

**Endpoint:** `POST /api/admin/test-alert`

**Code Review:**
```typescript
// admin.ts:894-909
router.post('/test-alert', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sendTestAlert } = await import('../jobs/jobAlerting.js');
    const results = await sendTestAlert();

    res.json({
      message: 'Test alerts sent',
      results,  // { email: boolean, sms: boolean }
    });
  } catch (err) {
    console.error('POST /api/admin/test-alert error:', err);
    res.status(500).json({ error: 'Failed to send test alert' });
  }
});
```

**Good Design:**
- Returns boolean flags for email/SMS success
- Uses `sendTestAlert()` function specifically designed for testing
- Non-critical test execution (doesn't mark as "critical")

**Untested Behaviors:**
1. Does it actually send email to ADMIN_EMAIL?
2. Does it send SMS to ADMIN_PHONE (if configured)?
3. What happens if email queue fails?
4. Are test emails marked differently to avoid confusion?

**Test Plan Required:**
```bash
# 1. With ADMIN_EMAIL set but ADMIN_PHONE unset
POST /api/admin/test-alert
Expected: { email: true, sms: false }

# 2. With both set
POST /api/admin/test-alert
Expected: { email: true, sms: true }

# 3. Verify email received
- Check admin inbox
- Subject should be: "[RGFL] Job Failure: test-alert"
- Body should contain: "This is a test alert to verify..."
```

---

### ISSUE #3: No Deduplication for Rapid Failures

**Severity:** P1 - HIGH
**Impact:** Email/SMS spam during cascading failures

**Scenario:**
```
3:00 PM - lock-picks job fails → Email + SMS sent
3:01 PM - lock-picks retry fails → Email + SMS sent (duplicate!)
3:02 PM - auto-pick job fails → Email + SMS sent
3:03 PM - auto-pick retry fails → Email + SMS sent (duplicate!)
```

**Code Review:**
```typescript
// jobMonitor.ts:74-77
alertJobFailure(execution).catch((alertError) => {
  console.error('Failed to send job failure alert:', alertError);
});
// ⚠️ Calls alert EVERY time, no deduplication logic!
```

**Current Behavior:**
- **Every single failure** triggers alert
- Cascading failures → email flood
- Admin phone gets SMS bombed (potential carrier rate limits)

**Best Practices:**
1. Rate limiting (max 1 alert per job per 5 minutes)
2. Batching (collect failures, send summary every 15 min)
3. Cooldown periods after first alert

**Example Fix:**
```typescript
const lastAlertTime = new Map<string, number>();

export async function alertJobFailure(execution: JobExecution): Promise<void> {
  const cooldownMs = 5 * 60 * 1000; // 5 minutes
  const lastAlert = lastAlertTime.get(execution.jobName);

  if (lastAlert && Date.now() - lastAlert < cooldownMs) {
    console.log(`[Job Alerting] Cooldown active for ${execution.jobName}, skipping alert`);
    return;
  }

  lastAlertTime.set(execution.jobName, Date.now());
  // ... send alerts
}
```

---

### ISSUE #4: Missing Stack Traces in Email Alerts

**Severity:** P1 - HIGH
**Impact:** Hard to debug issues, incomplete information

**Email Content Analysis:**
```typescript
// jobAlerting.ts:76-86
const html = `
  <h2>Scheduled Job Failure</h2>
  <p><strong>Job Name:</strong> ${execution.jobName}</p>
  <p><strong>Severity:</strong> ${isCritical ? '🚨 CRITICAL' : '⚠️ Normal'}</p>
  <p><strong>Start Time:</strong> ${execution.startTime.toISOString()}</p>
  <p><strong>End Time:</strong> ${execution.endTime?.toISOString() || 'N/A'}</p>
  <p><strong>Duration:</strong> ${execution.durationMs ? `${execution.durationMs}ms` : 'N/A'}</p>

  <h3>Error Details</h3>
  <pre>${execution.error || 'Unknown error'}</pre>
  <!-- ⚠️ Only shows error.message, NO STACK TRACE -->
</pre>
```

**Problem:**
JobExecution interface only captures `error.message`, not stack trace:

```typescript
// jobMonitor.ts:70
execution.error = error instanceof Error ? error.message : String(error);
// ❌ Loses error.stack completely!
```

**Impact:**
Admin receives email:
```
Error Details:
Connection timeout
```

But needs to see:
```
Error Details:
Connection timeout
  at fetchScores (server/src/jobs/scoring.ts:45)
  at runJob (server/src/jobs/index.ts:120)
  at Timeout._onTimeout (node:internal/timers:123)
```

**Fix:**
```typescript
interface JobExecution {
  jobName: string;
  // ...
  error?: string;
  errorStack?: string;  // Add this field
}

// In jobMonitor.ts:70
if (error instanceof Error) {
  execution.error = error.message;
  execution.errorStack = error.stack;
} else {
  execution.error = String(error);
}

// In email template:
<h3>Error Details</h3>
<pre>${execution.error || 'Unknown error'}</pre>
${execution.errorStack ? `
  <h3>Stack Trace</h3>
  <pre style="font-size: 11px;">${execution.errorStack}</pre>
` : ''}
```

---

## MEDIUM PRIORITY IMPROVEMENTS (P2)

### IMPROVEMENT #1: Add Direct Links to Job History

**Current "Next Steps" in Email:**
```html
<li>Check job history: <code>GET /api/admin/jobs/history?jobName=${execution.jobName}</code></li>
```

**Problem:** Admin must manually construct URL or use curl

**Better UX:**
```html
<li>
  <a href="${process.env.APP_URL}/admin/jobs?filter=${execution.jobName}">
    View ${execution.jobName} job history in admin dashboard
  </a>
</li>
<li>
  <a href="${process.env.APP_URL}/admin/system-health">
    View system health status
  </a>
</li>
```

---

### IMPROVEMENT #2: Add Job Execution Context to Alerts

**Current:** Only shows job name, error, timestamp
**Missing:** What was the job trying to do when it failed?

**Example for `lock-picks` job:**
```typescript
// Add to JobExecution interface:
interface JobExecution {
  // ...
  context?: Record<string, any>;  // Job-specific metadata
}

// In lock-picks job:
await monitoredJobExecution('lock-picks', async () => {
  const context = {
    episodeId: currentEpisode.id,
    episodeNumber: currentEpisode.number,
    picksLocked: 0,
  };

  // Execute job...
  context.picksLocked = result.count;

  return { context };
});
```

**Email shows:**
```
Job Context:
- Episode ID: abc-123
- Episode Number: 5
- Picks Locked: 42 (before failure)
```

---

## POSITIVE FINDINGS ✅

### What Works Well

1. **Clean Architecture**
   - Clear separation: monitoring (tracking) vs alerting (notifications)
   - monitoredJobExecution wrapper is elegant and reusable
   - Circular buffer design prevents memory leaks

2. **Comprehensive Email Content**
   - Job name, severity, timestamps, duration
   - Critical job context (explains why job matters)
   - Clear next steps for debugging
   - Both HTML and plain text versions

3. **Critical Job Differentiation**
   - `CRITICAL_JOBS` set properly identifies high-impact failures
   - Critical jobs get both email AND SMS
   - Normal jobs get email only (appropriate)

4. **Error Handling**
   - Alert failures don't crash job execution (async catch)
   - Fallback behavior when Twilio/email not configured
   - Console logging for audit trail

5. **Test Alert Function**
   - Dedicated `sendTestAlert()` for verification
   - Returns boolean success flags
   - Uses non-critical test execution

6. **STOP Compliance**
   - Twilio integration properly uses `isTransactional: true` for admin alerts
   - Won't be blocked by user STOP commands (correct behavior)

---

## TEST SCENARIOS

### Scenario 1: Normal Job Failure (auto-pick)

**Setup:**
- Job: `auto-pick` (not in CRITICAL_JOBS)
- ADMIN_EMAIL configured
- ADMIN_PHONE configured

**Expected Behavior:**
1. ✅ Email alert sent to ADMIN_EMAIL
2. ✅ Subject: `[RGFL] Job Failure: auto-pick`
3. ✅ Email contains error message, timestamp, duration
4. ✅ Email includes "Next Steps" section
5. ❌ NO SMS sent (normal priority)

**Actual (Based on Code):**
- Email: ✅ Should work
- SMS: ✅ Correctly skipped (line 59-61 in jobAlerting.ts)

---

### Scenario 2: Critical Job Failure (lock-picks)

**Setup:**
- Job: `lock-picks` (in CRITICAL_JOBS)
- ADMIN_EMAIL configured
- ADMIN_PHONE configured

**Expected Behavior:**
1. ✅ Email alert sent to ADMIN_EMAIL
2. ✅ Subject: `[RGFL] CRITICAL: Job "lock-picks" Failed`
3. ✅ Email marked as critical type
4. ✅ SMS sent to ADMIN_PHONE
5. ✅ SMS message includes job name and error snippet

**Actual (Based on Code):**
- Email: ✅ Should work (line 72-74, critical=true)
- SMS: ✅ Should work (line 154, truncates to 100 chars)

---

### Scenario 3: Missing ADMIN_EMAIL

**Setup:**
- ADMIN_EMAIL not set in environment
- Job fails

**Expected Behavior:**
1. ⚠️ Alert system should log warning
2. ❌ No email sent
3. ⚠️ Job execution continues (don't crash)

**Actual (Based on Code):**
- Line 38-40: Logs warning but continues ✅
- Line 68-70: Silently returns if no email ✅
- **PROBLEM:** No startup validation, admin doesn't know alerts are disabled

---

### Scenario 4: Email Queue Failure

**Setup:**
- ADMIN_EMAIL configured
- Email queue service is down (Resend API error)
- Job fails

**Expected Behavior:**
1. ⚠️ Alert attempt logged
2. ❌ Alert failure logged (catch block)
3. ✅ Original job failure still recorded in history

**Actual (Based on Code):**
```typescript
// Line 131-143
try {
  await enqueueEmail({ /* ... */ });
  console.log(`[Job Alerting] Email alert queued for ${execution.jobName} failure`);
} catch (error) {
  console.error('[Job Alerting] Failed to enqueue email alert:', error);
  // ✅ Catches error, logs it, doesn't crash
}
```

**Good:** Error handling is solid ✅

---

## RECOMMENDATIONS

### Immediate Actions (Before Launch)

1. **FIX P0 BUG:** Resolve `week_number` issue in spoiler-safe notifications
   - Blocks result release job
   - Blocks all testing of alert system end-to-end

2. **VALIDATE ENVIRONMENT:** Add startup check for ADMIN_EMAIL
   ```typescript
   if (!process.env.ADMIN_EMAIL) {
     throw new Error('ADMIN_EMAIL required for production deployment');
   }
   ```

3. **TEST ALERT ENDPOINT:** Deploy server, call POST /api/admin/test-alert
   - Verify email received
   - Verify SMS received (if ADMIN_PHONE set)
   - Verify content matches template

4. **ADD DEDUPLICATION:** Implement 5-minute cooldown for repeated job failures

5. **CAPTURE STACK TRACES:** Add `errorStack` field to JobExecution interface

---

### Post-Launch Improvements

1. **Enhanced Monitoring:**
   - Add Slack/Discord webhook option (faster than email)
   - Create admin dashboard widget showing recent alerts
   - Add alert history to `/api/admin/jobs/history` response

2. **Alert Grouping:**
   - Batch multiple failures into single digest email
   - Send summary every 15 minutes instead of per-failure

3. **Severity Levels:**
   - Expand beyond critical/normal
   - Add: info, warning, error, critical, emergency
   - Configure different alert channels per severity

4. **Context Enrichment:**
   - Add system metrics (CPU, memory, DB connections) to alerts
   - Include recent logs (last 50 lines) in critical alerts
   - Add link to Railway logs with timestamp filter

---

## RISK ASSESSMENT

### High Risk Areas

1. **Silent Failures (P0)**
   - Alert system initialized but ADMIN_EMAIL not set
   - Jobs fail silently, admin never notified
   - **Mitigation:** Startup validation (throw error if missing)

2. **Email/SMS Delivery Failures (P1)**
   - No monitoring of alert delivery success
   - If Resend/Twilio down, admin doesn't know
   - **Mitigation:** Secondary alert channel (Slack webhook)

3. **Alert Fatigue (P1)**
   - Rapid failures → email/SMS flood
   - Admin ignores alerts → real issues missed
   - **Mitigation:** Deduplication + batching

---

## CONFIGURATION CHECKLIST

Before deploying to production, verify:

- [ ] `ADMIN_EMAIL` set to valid email address
- [ ] `ADMIN_PHONE` set to valid phone number (E.164 format)
- [ ] Test alert sent and received via email
- [ ] Test alert sent and received via SMS
- [ ] Email queue operational (check `/api/admin/email-queue/stats`)
- [ ] Twilio credentials valid (check server startup logs)
- [ ] Week_number bug fixed in spoiler-safe notifications
- [ ] Job monitoring initialized (check server startup logs)

---

## APPENDIX A: Alert Email Example

Based on code analysis, here's what a critical job failure email should look like:

**Subject:** `[RGFL] CRITICAL: Job "lock-picks" Failed`

**Body:**
```html
Scheduled Job Failure

Job Name: lock-picks
Severity: 🚨 CRITICAL
Start Time: 2025-12-27T15:00:00.000Z
End Time: 2025-12-27T15:00:05.342Z
Duration: 5342ms

Error Details:
Connection timeout while connecting to database

⚠️ Critical Job - Immediate Action Required
This job is critical to the platform's operation. Please investigate immediately:
  • lock-picks: Ensures picks are locked before episode airs
  • auto-pick: Assigns picks for users who missed deadline
  • draft-finalize: Finalizes draft at hard deadline
  • release-results: Releases spoiler-safe weekly results to players

Next Steps:
1. Check server logs for full stack trace
2. Verify external service connectivity (database, APIs)
3. Check job history: GET /api/admin/jobs/history?jobName=lock-picks
4. Manually retry if needed: Job will retry on next scheduled run

Generated by RGFL Job Monitoring System
```

**SMS (Critical Jobs Only):**
```
[RGFL] CRITICAL: Job "lock-picks" failed at 3:00:00 PM. Error: Connection timeout while connecting to database... Check email for details.
```

---

## APPENDIX B: Test Alert Endpoint Usage

**Request:**
```bash
curl -X POST https://rgfl-api-production.up.railway.app/api/admin/test-alert \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json"
```

**Expected Response (Success):**
```json
{
  "message": "Test alerts sent",
  "results": {
    "email": true,
    "sms": true
  }
}
```

**Expected Response (ADMIN_PHONE not set):**
```json
{
  "message": "Test alerts sent",
  "results": {
    "email": true,
    "sms": false
  }
}
```

**Expected Response (Both disabled):**
```json
{
  "message": "Test alerts sent",
  "results": {
    "email": false,
    "sms": false
  }
}
```

---

## APPENDIX C: Critical Jobs List

From `jobAlerting.ts:14-19`:

```typescript
const CRITICAL_JOBS = new Set([
  'lock-picks',      // Locks weekly picks before episode airs
  'auto-pick',       // Auto-assigns picks for users who missed deadline
  'draft-finalize',  // Finalizes draft at hard deadline
  'release-results', // Releases spoiler-safe weekly results
]);
```

**Impact if these jobs fail:**
- `lock-picks`: Users can change picks after episode starts (unfair)
- `auto-pick`: Users with no pick get zero points (bad UX)
- `draft-finalize`: Draft never completes, users can't play (game breaking)
- `release-results`: Users never see scores (complete failure)

All correctly marked as critical ✅

---

## CONCLUSION

The job failure alerting system is **architecturally sound** but has **critical implementation gaps** that prevent production deployment:

1. **BLOCKING:** week_number bug breaks spoiler-safe notifications (prevents end-to-end testing)
2. **HIGH RISK:** No environment validation (alerts silently disabled)
3. **HIGH RISK:** No deduplication (email/SMS flooding)
4. **HIGH RISK:** Missing stack traces (hard to debug)

**Recommendation:** Fix P0 bug and P1 issues before launch. The alerting system is the last line of defense for production monitoring - it must be bulletproof.

**Estimated Fix Time:** 4-6 hours
- P0 bug: 30 minutes (add column OR change code)
- Environment validation: 15 minutes
- Deduplication: 2 hours (testing required)
- Stack traces: 1 hour
- End-to-end testing: 2 hours

**Next Steps:**
1. Fix week_number bug in spoiler-safe-notifications.ts
2. Add startup validation for ADMIN_EMAIL
3. Deploy server and run test-alert endpoint
4. Verify email/SMS received
5. Trigger actual job failure and verify alert content
6. Document alert examples in production runbook
