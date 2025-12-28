# SMS Alerting Test Guide

Quick guide for testing job failure SMS alerting system.

## Prerequisites

1. **Environment Variables Set:**
   ```bash
   ADMIN_EMAIL=your-email@example.com
   ADMIN_PHONE=+1XXXXXXXXXX
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=+14247227529
   ```

2. **Admin Phone Verified:**
   - SMS notifications enabled (`notification_sms = true`)
   - Phone number in E.164 format (+1XXXXXXXXXX)

## Test Methods

### Method 1: Automated Test Script (Recommended)

Run the comprehensive test suite:

```bash
cd server
npx tsx test-sms-alerting.ts
```

**What it does:**
- Verifies alerting configuration
- Simulates 4 critical job failures (SMS + Email)
- Simulates 2 non-critical job failures (Email only)
- Tests long error truncation
- Provides summary and verification steps

**Expected Output:**
```
================================================================================
SMS ALERTING TEST SUITE
================================================================================

TEST 1: Verify Alerting Configuration
...

TEST 2: Critical Job Failures (Should Send SMS + Email)
Testing: lock-picks
✓ Alert sent successfully
  → Email: Queued to admin email
  → SMS: Sent to admin phone (transactional)
...

TEST 3: Non-Critical Job Failures (Should Send Email Only)
Testing: email-queue-processor
✓ Alert sent successfully
  → Email: Queued to admin email
  → SMS: SKIPPED (non-critical job)
...

✓ All tests completed!
```

### Method 2: API Endpoint Testing

**1. Check Configuration:**
```bash
curl -X GET "https://rgfl-api-production.up.railway.app/api/admin/alerting/config" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.'
```

**Expected Response:**
```json
{
  "emailEnabled": true,
  "smsEnabled": true,
  "adminEmail": "admin@example.com",
  "criticalJobs": [
    "lock-picks",
    "auto-pick",
    "draft-finalize",
    "release-results"
  ]
}
```

**2. Send Test Alert:**
```bash
curl -X POST "https://rgfl-api-production.up.railway.app/api/admin/test-alert" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

**Expected Response:**
```json
{
  "message": "Test alerts sent",
  "results": {
    "email": true,
    "sms": true
  }
}
```

**Expected SMS:**
```
[RGFL] Test alert: Job monitoring SMS is configured correctly.
```

### Method 3: Manual Job Failure Simulation

**In Node.js REPL or test script:**

```typescript
import { alertJobFailure } from './src/jobs/jobAlerting.js';
import { initializeAlerting } from './src/jobs/jobAlerting.js';

// Initialize
initializeAlerting({
  adminEmail: 'admin@example.com',
  adminPhone: '+1XXXXXXXXXX'
});

// Simulate critical job failure (sends SMS + Email)
await alertJobFailure({
  jobName: 'lock-picks',
  startTime: new Date(),
  endTime: new Date(),
  durationMs: 1500,
  success: false,
  error: 'Database connection timeout: Unable to lock picks'
});

// Simulate non-critical job failure (sends Email only)
await alertJobFailure({
  jobName: 'email-queue-processor',
  startTime: new Date(),
  endTime: new Date(),
  durationMs: 800,
  success: false,
  error: 'Resend API rate limit exceeded'
});
```

## Verification Checklist

### Critical Job Failures (4 jobs × 1 test = 4 SMS + 4 Emails)

- [ ] **lock-picks** failure
  - [ ] Email received: Subject `[RGFL] CRITICAL: Job "lock-picks" Failed`
  - [ ] SMS received: `[RGFL] CRITICAL: Job "lock-picks" failed at...`
  - [ ] SMS under 160 characters
  - [ ] Email contains full error details and next steps

- [ ] **auto-pick** failure
  - [ ] Email received: Subject `[RGFL] CRITICAL: Job "auto-pick" Failed`
  - [ ] SMS received: `[RGFL] CRITICAL: Job "auto-pick" failed at...`
  - [ ] SMS under 160 characters

- [ ] **draft-finalize** failure
  - [ ] Email received: Subject `[RGFL] CRITICAL: Job "draft-finalize" Failed`
  - [ ] SMS received: `[RGFL] CRITICAL: Job "draft-finalize" failed at...`
  - [ ] SMS under 160 characters

- [ ] **release-results** failure
  - [ ] Email received: Subject `[RGFL] CRITICAL: Job "release-results" Failed`
  - [ ] SMS received: `[RGFL] CRITICAL: Job "release-results" failed at...`
  - [ ] SMS under 160 characters

### Non-Critical Job Failures (2 jobs × 1 test = 0 SMS + 2 Emails)

- [ ] **email-queue-processor** failure
  - [ ] Email received: Subject `[RGFL] Job Failure: email-queue-processor` (NOT CRITICAL)
  - [ ] NO SMS received

- [ ] **pick-reminders** failure
  - [ ] Email received: Subject `[RGFL] Job Failure: pick-reminders` (NOT CRITICAL)
  - [ ] NO SMS received

### Special Tests

- [ ] **Long error truncation**
  - [ ] Error message truncated to 100 characters in SMS
  - [ ] SMS stays under 160 characters
  - [ ] Full error available in email

- [ ] **Transactional bypass**
  - [ ] SMS sent even if admin has `notification_sms = false`
  - [ ] `isTransactional: true` flag bypasses STOP

## Expected SMS Message Format

```
[RGFL] CRITICAL: Job "lock-picks" failed at 3:00:00 PM. Error: Database connection timeout: Unable to lock picks for league_id=abc123... Check email for details.
```

**Components:**
- Prefix: `[RGFL]` (sender identifier)
- Severity: `CRITICAL` (instant recognition)
- Job Name: `"lock-picks"` (what failed)
- Timestamp: `3:00:00 PM` (when it failed)
- Error Snippet: First 100 chars of error
- Action: `Check email for details`

**Length:** 150-160 characters (fits in single SMS segment)

## Expected Email Format

**Subject:** `[RGFL] CRITICAL: Job "lock-picks" Failed`

**Body Highlights:**
- Job details (name, severity, timing, duration)
- Full error message (not truncated)
- Business context (why this job is critical)
- Next steps with actionable instructions
- API endpoint for job history

## Troubleshooting

### No SMS Received

1. **Check Twilio Configuration:**
   ```bash
   env | grep TWILIO
   ```
   - Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` are set

2. **Check Admin Phone:**
   ```bash
   env | grep ADMIN_PHONE
   ```
   - Must be E.164 format: `+1XXXXXXXXXX`
   - US phone number required

3. **Check Twilio Logs:**
   - Visit https://console.twilio.com/us1/monitor/logs/sms
   - Look for failed deliveries or rate limits

4. **Check Railway Logs:**
   ```bash
   railway logs --service rgfl-api
   ```
   - Look for: `[Job Alerting] SMS alert sent for...`
   - Look for errors: `Failed to send SMS alert`

### No Email Received

1. **Check Email Queue:**
   ```bash
   curl -X GET "https://rgfl-api-production.up.railway.app/api/admin/failed-emails" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Check Resend Configuration:**
   ```bash
   env | grep RESEND_API_KEY
   ```

3. **Check Spam Folder:**
   - Subject: `[RGFL] CRITICAL: Job "..." Failed`
   - From: Resend sender address

### Alert Not Triggered

1. **Check Job Monitoring:**
   ```bash
   curl -X GET "https://rgfl-api-production.up.railway.app/api/admin/jobs/history" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   - Verify job failures are being recorded

2. **Check Alert Integration:**
   - Ensure job uses `monitoredJobExecution()` wrapper
   - Check `jobMonitor.ts:74-77` for alert call

## Success Criteria

- [ ] All 4 critical jobs send SMS + Email on failure
- [ ] All non-critical jobs send Email only (no SMS)
- [ ] SMS messages are concise (under 160 chars)
- [ ] SMS messages include job name, timestamp, error snippet
- [ ] Email messages include full error and next steps
- [ ] Transactional flag bypasses STOP/unsubscribe
- [ ] Test alert endpoint works (`POST /api/admin/test-alert`)
- [ ] Configuration endpoint shows correct setup

## Notes

- **SMS Cost:** ~$0.0075 per message (4 critical jobs × occasional failures = minimal cost)
- **Delivery Time:** SMS typically arrives within 5-30 seconds
- **Rate Limits:** Twilio has rate limits (varies by account tier)
- **International:** US phone numbers only (admin requirement)

## Quick Reference

| Job Name | Critical? | Email | SMS |
|----------|-----------|-------|-----|
| lock-picks | ✅ Yes | ✅ | ✅ |
| auto-pick | ✅ Yes | ✅ | ✅ |
| draft-finalize | ✅ Yes | ✅ | ✅ |
| release-results | ✅ Yes | ✅ | ✅ |
| email-queue-processor | ❌ No | ✅ | ❌ |
| pick-reminders | ❌ No | ✅ | ❌ |
| results-notification | ❌ No | ✅ | ❌ |
| weekly-summary | ❌ No | ✅ | ❌ |
| draft-reminders | ❌ No | ✅ | ❌ |
