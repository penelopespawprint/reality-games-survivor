# Email Queue Verification Checklist

**Purpose:** Manual testing guide for verifying email queue functionality in staging/production

**Prerequisites:**
- Access to Supabase dashboard
- Access to server logs (Railway)
- Test email addresses
- Resend API access (to check delivery)

---

## Test 1: Basic Email Queueing

**Objective:** Verify emails are correctly inserted into the queue

### Steps:

1. **Trigger an email** (e.g., request magic link login)
   ```bash
   curl -X POST https://rgfl-api-production.up.railway.app/api/auth/magic-link \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Check Supabase `email_queue` table**
   - Open Supabase > Table Editor > `email_queue`
   - Filter: `sent_at IS NULL`
   - Verify new row exists with:
     - ✅ `to_email` = test@example.com
     - ✅ `type` = 'normal' or 'critical'
     - ✅ `attempts` = 0
     - ✅ `max_attempts` = 3
     - ✅ `created_at` is recent
     - ✅ `sent_at` IS NULL
     - ✅ `failed_at` IS NULL

3. **Wait 5 minutes** (next cron run)

4. **Check email was processed**
   - Refresh `email_queue` table
   - Verify row now has:
     - ✅ `sent_at` timestamp set
     - ✅ `attempts` still 0 (successful first try)

5. **Check Resend dashboard**
   - Log into Resend > Emails
   - Verify email was delivered
   - Check delivery status

**Pass Criteria:**
- Email queued within 1 second
- Email sent within 6 minutes (1 cron cycle)
- Email delivered to inbox

---

## Test 2: Exponential Backoff (Failed Email)

**Objective:** Verify retry logic with increasing delays

### Steps:

1. **Queue an email to invalid domain**
   ```typescript
   // Via API or direct database insert
   INSERT INTO email_queue (
     type, to_email, subject, html, attempts, max_attempts
   ) VALUES (
     'normal',
     'test@invalid-domain-12345.com',
     'Test Retry',
     '<p>This will fail</p>',
     0,
     3
   );
   ```

2. **Wait for first processing attempt**
   - Check server logs for error
   - Expected: "Email send error" or similar

3. **Check database after first failure**
   ```sql
   SELECT
     attempts,
     last_error,
     next_retry_at,
     (next_retry_at - created_at) as retry_delay
   FROM email_queue
   WHERE to_email = 'test@invalid-domain-12345.com';
   ```

   **Verify:**
   - ✅ `attempts` = 1
   - ✅ `last_error` contains error message
   - ✅ `next_retry_at` is ~5 minutes after `created_at`
   - ✅ `sent_at` IS NULL
   - ✅ `failed_at` IS NULL

4. **Wait for second retry** (~5 minutes)
   - Check logs for second attempt

5. **Check database after second failure**
   **Verify:**
   - ✅ `attempts` = 2
   - ✅ `next_retry_at` is ~30 minutes after first failure
   - ✅ Delay increased exponentially

6. **Wait for third retry** (~30 minutes)
   - Check logs for third attempt

7. **Check database after third failure**
   **Verify:**
   - ✅ `attempts` = 3
   - ✅ `failed_at` timestamp is set
   - ✅ `sent_at` IS NULL
   - ✅ `next_retry_at` is ~120 minutes after second failure

8. **Check dead letter queue**
   ```sql
   SELECT * FROM failed_emails
   WHERE email_job->>'to_email' = 'test@invalid-domain-12345.com';
   ```

   **Verify:**
   - ✅ Row exists in `failed_emails`
   - ✅ `email_job` JSONB contains full email data
   - ✅ `failed_at` is set

**Pass Criteria:**
- Retry delays: ~5min, ~30min, ~120min
- Max 3 attempts before permanent failure
- Failed email moved to dead letter queue

---

## Test 3: Critical Email Priority

**Objective:** Verify critical emails retry faster than normal

### Steps:

1. **Queue a critical email to invalid domain**
   ```typescript
   INSERT INTO email_queue (
     type, to_email, subject, html, attempts, max_attempts
   ) VALUES (
     'critical',
     'critical@invalid-domain-12345.com',
     'Test Critical',
     '<p>Critical email</p>',
     0,
     3
   );
   ```

2. **Monitor retry schedule**
   ```sql
   SELECT
     type,
     attempts,
     (next_retry_at - created_at) as retry_delay
   FROM email_queue
   WHERE to_email = 'critical@invalid-domain-12345.com';
   ```

3. **Verify retry delays**
   - ✅ Attempt 1 → +1 minute
   - ✅ Attempt 2 → +5 minutes
   - ✅ Attempt 3 → +15 minutes

4. **Compare to normal email**
   - Critical total: ~21 minutes
   - Normal total: ~155 minutes
   - ✅ Critical is 7x faster

**Pass Criteria:**
- Critical emails retry faster (1/5/15 min vs 5/30/120 min)
- Both fail after 3 attempts

---

## Test 4: FIFO Ordering

**Objective:** Verify emails process in order (oldest first)

### Steps:

1. **Queue 5 emails with delays**
   ```typescript
   for (let i = 1; i <= 5; i++) {
     await enqueueEmail({
       to: `test-fifo-${i}@example.com`,
       subject: `Email ${i}`,
       html: `<p>Order: ${i}</p>`,
     });
     await sleep(100); // Ensure different created_at
   }
   ```

2. **Check queue order**
   ```sql
   SELECT id, to_email, created_at
   FROM email_queue
   WHERE to_email LIKE 'test-fifo-%@example.com'
     AND sent_at IS NULL
   ORDER BY created_at ASC;
   ```

3. **Verify processing order**
   - ✅ Email 1 has earliest `created_at`
   - ✅ Email 5 has latest `created_at`
   - ✅ All in ascending order

4. **Wait for processing**
   - Monitor logs for send order

5. **Check sent order**
   ```sql
   SELECT to_email, sent_at
   FROM email_queue
   WHERE to_email LIKE 'test-fifo-%@example.com'
   ORDER BY sent_at ASC;
   ```

6. **Verify FIFO**
   - ✅ Email 1 sent first
   - ✅ Email 5 sent last
   - ✅ Order matches queue order

**Pass Criteria:**
- Emails sent in order of `created_at` (oldest first)

---

## Test 5: Sent Email Not Reprocessed

**Objective:** Verify successful emails don't get sent twice

### Steps:

1. **Queue and process an email**
   ```typescript
   const emailId = await enqueueEmail({
     to: 'test-once@example.com',
     subject: 'Test No Duplicate',
     html: '<p>Should send once</p>',
   });
   ```

2. **Wait for successful send**
   - Check `sent_at` is set

3. **Manually trigger queue processor**
   ```bash
   curl -X POST https://rgfl-api-production.up.railway.app/api/admin/jobs/run \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{"job": "email-queue-processor"}'
   ```

4. **Check attempts didn't increment**
   ```sql
   SELECT id, attempts, sent_at
   FROM email_queue
   WHERE id = 'EMAIL_ID';
   ```

   **Verify:**
   - ✅ `attempts` still 0
   - ✅ `sent_at` unchanged

5. **Check inbox**
   - ✅ Only 1 email received (no duplicate)

**Pass Criteria:**
- Email sent once and only once
- Sent emails excluded from processing queue

---

## Test 6: Queue Statistics Accuracy

**Objective:** Verify queue stats function returns accurate counts

### Steps:

1. **Create test data**
   - Queue 5 pending emails
   - Queue 3 emails with `next_retry_at` in future
   - Mark 10 emails as sent today
   - Mark 2 emails as failed today

2. **Call stats endpoint**
   ```bash
   curl https://rgfl-api-production.up.railway.app/api/admin/email-queue/stats \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

3. **Verify response**
   ```json
   {
     "pending": 5,
     "processing": 3,
     "sent_today": 10,
     "failed_today": 2
   }
   ```

4. **Cross-check with database**
   ```sql
   -- Pending
   SELECT COUNT(*) FROM email_queue
   WHERE sent_at IS NULL AND failed_at IS NULL;

   -- Processing (with retry scheduled)
   SELECT COUNT(*) FROM email_queue
   WHERE sent_at IS NULL AND failed_at IS NULL AND next_retry_at IS NOT NULL;

   -- Sent today
   SELECT COUNT(*) FROM email_queue
   WHERE sent_at >= CURRENT_DATE;

   -- Failed today
   SELECT COUNT(*) FROM email_queue
   WHERE failed_at >= CURRENT_DATE;
   ```

**Pass Criteria:**
- Stats match database counts
- All counts non-negative

---

## Test 7: High Volume Batch Processing

**Objective:** Verify queue handles large batch (50 email limit)

### Steps:

1. **Queue 100 emails**
   ```typescript
   for (let i = 1; i <= 100; i++) {
     await enqueueEmail({
       to: `batch-test-${i}@example.com`,
       subject: `Batch ${i}`,
       html: `<p>Email ${i}</p>`,
     });
   }
   ```

2. **Check queue depth**
   ```sql
   SELECT COUNT(*) FROM email_queue
   WHERE to_email LIKE 'batch-test-%@example.com'
     AND sent_at IS NULL;
   ```
   - ✅ 100 pending emails

3. **Wait for first cron run** (5 minutes)

4. **Check processing results**
   ```sql
   SELECT COUNT(*) FROM email_queue
   WHERE to_email LIKE 'batch-test-%@example.com'
     AND sent_at IS NOT NULL;
   ```
   - ✅ 50 emails sent (batch limit)
   - ✅ 50 emails still pending

5. **Wait for second cron run** (5 minutes)

6. **Check all processed**
   - ✅ 100 emails sent
   - ✅ 0 emails pending

**Pass Criteria:**
- Processes 50 emails per cron run
- All emails eventually sent
- No duplicates

---

## Test 8: Dead Letter Queue Review

**Objective:** Verify failed emails are accessible for admin review

### Steps:

1. **Create permanently failed email** (see Test 2)

2. **Query dead letter queue**
   ```sql
   SELECT
     id,
     email_job->>'to_email' as recipient,
     email_job->>'subject' as subject,
     failed_at,
     retry_attempted,
     notes
   FROM failed_emails
   ORDER BY failed_at DESC
   LIMIT 10;
   ```

3. **Verify data integrity**
   - ✅ Full email data preserved in `email_job` JSONB
   - ✅ `failed_at` timestamp set
   - ✅ Accessible for admin review

4. **Manual retry (if admin endpoint exists)**
   ```bash
   curl -X POST https://rgfl-api-production.up.railway.app/api/admin/email-queue/retry/EMAIL_ID \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

**Pass Criteria:**
- Failed emails preserved with full data
- Admin can view failed emails
- (Future) Admin can retry failed emails

---

## Test 9: Cleanup Job (if implemented)

**Objective:** Verify old sent emails are deleted

### Steps:

1. **Create old sent email**
   ```sql
   INSERT INTO email_queue (
     type, to_email, subject, html, sent_at
   ) VALUES (
     'normal',
     'old@example.com',
     'Old Email',
     '<p>Old</p>',
     NOW() - INTERVAL '31 days'
   );
   ```

2. **Run cleanup job** (if scheduled)
   ```bash
   curl -X POST https://rgfl-api-production.up.railway.app/api/admin/jobs/run \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{"job": "email-queue-cleanup"}'
   ```

3. **Verify deletion**
   ```sql
   SELECT COUNT(*) FROM email_queue
   WHERE to_email = 'old@example.com';
   ```
   - ✅ 0 rows (deleted)

4. **Verify recent emails preserved**
   ```sql
   SELECT COUNT(*) FROM email_queue
   WHERE sent_at >= NOW() - INTERVAL '30 days';
   ```
   - ✅ Recent emails not deleted

**Pass Criteria:**
- Emails >30 days old are deleted
- Recent emails preserved

---

## Test 10: Rate Limiting (if implemented)

**Objective:** Verify per-user rate limits prevent abuse

### Steps:

1. **Queue 101 emails rapidly** (exceeds 100/hour limit)
   ```typescript
   for (let i = 1; i <= 101; i++) {
     const result = await enqueueEmail({
       to: 'rate-test@example.com',
       subject: `Rate Test ${i}`,
       html: `<p>Email ${i}</p>`,
     });
     console.log(`Email ${i}: ${result ? 'Queued' : 'Rejected'}`);
   }
   ```

2. **Verify rate limit kicked in**
   - ✅ First 100 emails queued
   - ✅ Email 101 rejected (returns null)
   - ✅ Error logged: "Rate limit exceeded"

3. **Wait 1 hour**

4. **Try queueing again**
   - ✅ New email queued successfully
   - ✅ Rate limit reset after 1 hour

**Pass Criteria:**
- Max 100 emails per hour per recipient
- Rate limit resets after 1 hour
- Rejection logged but doesn't crash

---

## Monitoring Checklist

### Real-time Monitoring (Railway Logs)

Watch for these log patterns:

**Success Pattern:**
```
Email enqueued: abc-123 (normal) to user@example.com
Running scheduled job: email-queue-processor
✓ Email sent: abc-123 to user@example.com
Email queue processed: 5 emails (5 sent, 0 failed)
```

**Retry Pattern:**
```
Email send error: [error details]
⏳ Email retry scheduled: abc-123 (attempt 1/3) at 2025-12-27T12:05:00Z
```

**Failure Pattern:**
```
✗ Email failed permanently: abc-123 after 3 attempts
Moved email abc-123 to dead letter queue
```

### Database Queries (Supabase Dashboard)

**Pending Queue Depth:**
```sql
SELECT COUNT(*) as pending_emails
FROM email_queue
WHERE sent_at IS NULL AND failed_at IS NULL;
```

**Processing Rate (last hour):**
```sql
SELECT COUNT(*) as sent_last_hour
FROM email_queue
WHERE sent_at >= NOW() - INTERVAL '1 hour';
```

**Failure Rate (last hour):**
```sql
SELECT COUNT(*) as failed_last_hour
FROM email_queue
WHERE failed_at >= NOW() - INTERVAL '1 hour';
```

**Average Retry Count:**
```sql
SELECT AVG(attempts) as avg_retries
FROM email_queue
WHERE sent_at IS NOT NULL;
```

**Dead Letter Queue Size:**
```sql
SELECT COUNT(*) as failed_total
FROM failed_emails;
```

---

## Alerting Thresholds

Set up alerts for these conditions:

| Condition | Threshold | Severity |
|-----------|-----------|----------|
| Queue depth | >500 pending | WARNING |
| Queue depth | >1000 pending | CRITICAL |
| Failure rate | >10% last hour | WARNING |
| Failure rate | >25% last hour | CRITICAL |
| Dead letter size | >100 emails | WARNING |
| Processing stopped | 0 sent in 30 min | CRITICAL |

---

## Rollback Plan

If email queue is causing issues:

1. **Disable cron job**
   ```typescript
   // In scheduler.ts
   {
     name: 'email-queue-processor',
     enabled: false, // ← Disable here
   }
   ```

2. **Deploy with scheduler disabled**
   ```bash
   git commit -m "Disable email queue processor"
   git push origin main
   ```

3. **Drain queue manually**
   ```sql
   -- Mark all pending as failed (emergency only)
   UPDATE email_queue
   SET failed_at = NOW()
   WHERE sent_at IS NULL AND failed_at IS NULL;
   ```

4. **Revert to direct email sending**
   ```typescript
   // Replace enqueueEmail() with sendEmail()
   - await enqueueEmail({ to, subject, html });
   + await sendEmail({ to, subject, html });
   ```

---

## Sign-Off Template

After completing all tests, sign off with:

```
✅ Email Queue Verification Complete

Tested by: [Your Name]
Date: [Date]
Environment: [Staging/Production]

Test Results:
- Test 1 (Basic Queueing): PASS/FAIL
- Test 2 (Exponential Backoff): PASS/FAIL
- Test 3 (Critical Priority): PASS/FAIL
- Test 4 (FIFO Ordering): PASS/FAIL
- Test 5 (No Reprocessing): PASS/FAIL
- Test 6 (Queue Stats): PASS/FAIL
- Test 7 (High Volume): PASS/FAIL
- Test 8 (Dead Letter Queue): PASS/FAIL
- Test 9 (Cleanup Job): PASS/FAIL (if implemented)
- Test 10 (Rate Limiting): PASS/FAIL (if implemented)

Issues Found: [List any issues]

Recommendation: GO/NO-GO for production
```

---

**Last Updated:** December 27, 2025
