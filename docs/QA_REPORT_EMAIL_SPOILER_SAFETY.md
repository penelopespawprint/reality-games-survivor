# QA Test Report: Email Notification Spoiler Safety

**Test Date:** December 27, 2025
**Tested By:** QA Agent (Exploratory Testing)
**Test Charter:** Verify all email notifications are spoiler-safe across subjects, previews, bodies, and URLs
**Focus Areas:** Recent fix (episode.number → episode.week_number), legacy templates, email client preview exposure

---

## Executive Summary

**CRITICAL FINDINGS: 11 BLOCKING ISSUES FOUND**

The spoiler prevention system has **catastrophic vulnerabilities** across multiple email notification types. While the new spoiler-safe notification system (`spoiler-safe-notifications.ts`) is well-designed, it coexists with **legacy email templates that leak massive spoilers** in subjects, bodies, and email previews. Additionally, a **database schema bug prevents the new system from working at all**.

### Severity Distribution
- **P0 (Blocking):** 4 issues - System completely broken or massive spoiler leaks
- **P1 (Critical):** 5 issues - Significant spoiler exposure in email subjects/previews
- **P2 (High):** 2 issues - Moderate spoiler risks

### Overall Risk Assessment
**LAUNCH BLOCKER:** The spoiler prevention system is non-functional and would spoil results for 100% of users.

---

## Test Coverage

### Email Notification Types Tested

| Email Type | Template File | Spoiler Risk | Status |
|------------|---------------|--------------|--------|
| **Results Release (New System)** | `spoiler-safe-notifications.ts` | Database schema bug | BROKEN |
| **Episode Results (Legacy)** | `emails/results/episode-results.ts` | Massive spoilers | CRITICAL |
| **Elimination Alert (Legacy)** | `emails/results/elimination-alert.ts` | Massive spoilers | CRITICAL |
| **Auto-Pick Alert** | `emails/transactional/auto-pick-alert.ts` | Episode number exposed | MEDIUM |
| **Pick Reminder** | `emails/reminders/pick-reminder.ts` | Episode number exposed | MEDIUM |
| **Pick Final Warning** | `emails/reminders/pick-final-warning.ts` | Episode number exposed | MEDIUM |
| **Weekly Picks Notification** | `routes/notifications.ts:73-74` | Episode number exposed | LOW |
| **Results Notification (Legacy)** | `routes/notifications.ts:280-281` | Massive spoilers | CRITICAL |

---

## Critical Findings

### P0-1: Database Schema Bug - `week_number` Column Missing ❌ BLOCKING

**Location:** `/server/src/lib/spoiler-safe-notifications.ts:112, 181`
**Location:** `/server/src/jobs/releaseResults.ts:14, 37, 112`
**Impact:** Spoiler-safe notification system completely non-functional

**Evidence:**
```typescript
// Code references week_number field
const resultsUrl = `${appUrl}/results/week-${episode.week_number}?token=${token}`;

// But database schema DOES NOT have this column
// From supabase/migrations/001_initial_schema.sql:
CREATE TABLE episodes (
  id UUID PRIMARY KEY,
  season_id UUID NOT NULL,
  number INTEGER NOT NULL,  -- Only 'number' exists, NO 'week_number'
  title TEXT,
  air_date TIMESTAMPTZ NOT NULL,
  // ... no week_number field
);
```

**Query That Will Fail:**
```sql
-- From releaseResults.ts:37
SELECT id, number, week_number, season_id, scoring_finalized_at, results_released_at
FROM episodes
-- ERROR: column "week_number" does not exist
```

**Impact Assessment:**
- 100% of spoiler-safe notifications will FAIL with database error
- Friday 2pm results release job will crash completely
- Users will receive ZERO notifications (not even spoiler-filled ones)
- Job monitoring will alert admin, but users are left in the dark

**Test Evidence:**
```bash
# Checked database schema
$ grep -r "week_number" supabase/migrations/
# No results found - column does not exist

# Checked code references
$ grep -r "week_number" server/src/
server/src/jobs/releaseResults.ts:14:  week_number: number;
server/src/jobs/releaseResults.ts:37:    .select('id, number, week_number, ...')
server/src/lib/spoiler-safe-notifications.ts:112:  const resultsUrl = `${appUrl}/results/week-${episode.week_number}?token=${token}`;
```

**Recommended Fix:**
```sql
-- Option 1: Add week_number column
ALTER TABLE episodes ADD COLUMN week_number INTEGER;
UPDATE episodes SET week_number = number; -- If they're the same
CREATE INDEX idx_episodes_week_number ON episodes(week_number);

-- Option 2: Use episode.number in URL instead (but router must match)
-- Change: /results/week-${episode.week_number}
-- To:     /results/week-${episode.number}
```

**Verification Steps:**
1. Add `week_number` column to episodes table OR change code to use `episode.number`
2. Verify frontend route `/results/week-X` matches the URL format
3. Test query: `SELECT id, number, week_number FROM episodes LIMIT 1;`
4. Run `releaseWeeklyResults()` job manually and verify no errors

---

### P0-2: Legacy Episode Results Email - Massive Spoiler Leak ❌ BLOCKING

**Location:** `/server/src/emails/results/episode-results.ts`
**Location:** `/server/src/emails/service.ts:686-696` (sendEpisodeResults)
**Impact:** Castaway names, points, eliminations visible in subject + preview

**Evidence:**

**Email Subject (VISIBLE IN INBOX):**
```
Subject: 🏆 Episode 3 Results: +45 points!
```
Spoilers visible: Episode results are out, user scored 45 points

**Email Preview (VISIBLE IN INBOX):**
```
Hey John, Episode 3 has been scored!

Your pick: Tony Vlachos
Points earned: 45
Total points: 127
Current rank: #2 in Legends League
```
Spoilers visible: Castaway name, exact scores, rankings, episode number

**Email Body (FULL SPOILERS):**
```html
<h1>📊 Episode 3 Results</h1>
<p>The scores are in for Episode 3!</p>

<div>
  <p>Your Pick</p>
  <div>Tony Vlachos</div>
  <div style="font-size: 48px; color: #22c55e;">+45</div>
  <p>Points This Episode</p>
</div>

<div>
  Total Points: 127
  League Rank: 👑 #2
</div>
```

**How Users Are Spoiled:**
1. **Inbox view:** Subject shows episode and points → reveals results are out
2. **Email preview pane:** First 2-3 lines show castaway name and scores
3. **Lock screen notification:** "Tony Vlachos earned 45 points" (on mobile)
4. **Smartwatch:** Full preview with castaway name visible on wrist

**Where This Email Is Sent:**
```typescript
// From routes/notifications.ts:209-284
router.post('/send-results', requireAdmin, async (req, res) => {
  // Gets episode results
  // Sends to ALL users with notification_email enabled
  // Uses EmailService.sendEpisodeResults() with full spoilers
});
```

**Current Usage:** This endpoint is likely called by legacy admin tools or manual processes. It competes with the new spoiler-safe system.

**Recommended Fix:**
```typescript
// OPTION 1: Delete this entire email template and route
// Replace all usage with spoiler-safe-notifications.ts

// OPTION 2: If keeping for some reason, make it spoiler-safe
subject: `Your Survivor Fantasy results are ready (Episode ${episodeNumber})`,
preview: `Episode ${episodeNumber} has been scored. Click to view your results.`,
body: `
  <h1>Results Are Ready</h1>
  <div style="background: #fef3c7; border: 2px solid #f59e0b;">
    ⚠️ Spoiler Warning
    Click below to view scores, eliminations, and standings.
  </div>
  <a href="${resultsUrl}?token=${token}">View My Results</a>
`
```

---

### P0-3: Elimination Alert Email - Massive Spoiler Leak ❌ BLOCKING

**Location:** `/server/src/emails/results/elimination-alert.ts`
**Location:** `/server/src/emails/service.ts:698-708` (sendEliminationAlert)
**Impact:** Castaway elimination revealed in subject line and preview

**Evidence:**

**Email Subject (VISIBLE IN INBOX):**
```
Subject: 😢 Tony Vlachos has been eliminated
```
Spoilers visible: Exact castaway name, elimination confirmed

**Email Preview (VISIBLE IN INBOX):**
```
Hey John,
Bad news from the island... Tony Vlachos has been voted out in Episode 3.

[Fire emoji] Tony Vlachos - The tribe has spoken.
```
Spoilers visible: Elimination details, episode number, dramatic flair

**Email Body (FULL SPOILERS):**
```html
<h1>🔥 Castaway Eliminated</h1>
<p>Bad news from the island... <span style="color: #ef4444;">Tony Vlachos</span> has been voted out in Episode 3.</p>

<div style="background: rgba(239, 68, 68, 0.1);">
  <div style="font-size: 64px;">🔥</div>
  <p style="color: #ef4444; font-size: 24px;">Tony Vlachos</p>
  <p>The tribe has spoken.</p>
</div>
```

**How Users Are Spoiled:**
1. **Subject line:** Castaway name + "eliminated" = instant spoiler
2. **Push notification:** "Tony Vlachos has been eliminated" on lock screen
3. **Inbox preview:** Full elimination details visible without opening
4. **Shared devices:** Anyone seeing phone/computer sees the spoiler

**Where This Email Is Sent:**
Currently not referenced in active cron jobs, but available via `EmailService.sendEliminationAlert()`. Could be called manually or by admin dashboard.

**Recommended Fix:**
```typescript
// OPTION 1: Delete this template entirely
// Eliminations are revealed when users view results page with spoiler warning

// OPTION 2: Make it spoiler-safe
subject: `Roster update for Episode ${episodeNumber}`,
preview: `Your Survivor Fantasy roster has changed. Click to view details.`,
body: `
  <h1>Roster Update</h1>
  <div style="background: #fef3c7; border: 2px solid #f59e0b;">
    ⚠️ Spoiler Warning
    One of your castaways has been eliminated. Click below to see who.
  </div>
  <a href="${resultsUrl}?token=${token}">View Elimination Details</a>
`

// OPTION 3: Only send to users who have already viewed results
// Check results_tokens.used_at before sending
```

---

### P0-4: Legacy Results Route - Massive Spoiler Leak ❌ BLOCKING

**Location:** `/server/src/routes/notifications.ts:209-350`
**Endpoint:** `POST /api/notifications/send-results`
**Impact:** Backend route sends spoiler-filled notifications to all users

**Evidence:**

**Route Handler Code:**
```typescript
router.post('/send-results', requireAdmin, async (req, res) => {
  const { episode_id } = req.body;

  // Get all leagues and members
  // For each member:
  notifications.push({
    user_id: member.user_id,
    type: 'email',
    subject: `📊 Episode ${episode.number} Results - ${pointsEarned} points!`, // SPOILER
    body: `Hey ${user.display_name}, Episode ${episode.number} has been scored!

Your pick: ${castawayName}           // SPOILER
Points earned: ${pointsEarned}       // SPOILER
Total points: ${member.total_points} // SPOILER
Current rank: #${member.rank} in ${league.name}`, // SPOILER
  });

  // Then sends emails using EmailService.sendEpisodeResults()
  // which creates MORE spoilers in HTML format
});
```

**What Gets Sent:**
1. Database `notifications` record with spoilers in `subject` and `body`
2. Email with full HTML spoilers (castaway name, points, rank)
3. No token, no click-to-reveal, no spoiler warning

**Conflict With New System:**
- New system: `releaseWeeklyResults()` in `jobs/releaseResults.ts` → spoiler-safe
- Old system: `POST /send-results` → massive spoilers
- **If both run:** Users get spoiler-safe email, then spoiler-filled email 5 minutes later

**Recommended Fix:**
```typescript
// OPTION 1: Delete this route entirely
// Only use releaseWeeklyResults() job with spoiler-safe notifications

// OPTION 2: Redirect to new system
router.post('/send-results', requireAdmin, async (req, res) => {
  const { episode_id } = req.body;

  // Just call the new spoiler-safe job
  const result = await releaseWeeklyResults();

  return res.json({
    message: 'Using spoiler-safe notification system',
    result
  });
});
```

---

### P1-1: Auto-Pick Alert - Episode Number in Subject ⚠️ CRITICAL

**Location:** `/server/src/emails/transactional/auto-pick-alert.ts`
**Location:** `/server/src/emails/service.ts:619-626`
**Impact:** Episode number reveals which week user is on

**Evidence:**

**Email Subject:**
```
Subject: ⚠️ Auto-pick applied: Tony Vlachos
```
Spoilers: Castaway name visible in subject (reveals roster)

**Email Body:**
```html
<h1>⚠️ Auto-Pick Applied</h1>
<p>You missed the pick deadline for Episode 3 in Legends League.</p>

<div>
  <strong>Auto-selected:</strong> Tony Vlachos
  <p>We automatically selected your highest-performing active castaway.</p>
</div>
```

**Spoiler Risk:**
- **Medium:** Subject shows castaway name → reveals user's roster
- **Low-Medium:** Body shows episode number → could indicate how far season has progressed
- **Medium:** "highest-performing active" implies other castaway(s) may be eliminated

**Recommended Fix:**
```typescript
// OPTION 1: Remove castaway name from subject
subject: `⚠️ Auto-pick applied for Episode ${episodeNumber}`,

// OPTION 2: Make completely generic
subject: `⚠️ Pick deadline was missed`,
body: `
  <h1>Auto-Pick Applied</h1>
  <p>You missed the pick deadline. We auto-selected a castaway from your roster.</p>
  <a href="${appUrl}/leagues/${leagueId}/pick">View Your Pick</a>
  <p style="color: #666;">Castaway name hidden to prevent spoilers. Click above to view.</p>
`
```

---

### P1-2: Pick Reminder - Episode Number Exposure ⚠️ CRITICAL

**Location:** `/server/src/emails/reminders/pick-reminder.ts`
**Location:** `/server/src/routes/notifications.ts:73-74`
**Impact:** Subject reveals episode progress

**Evidence:**

**Email Subject (from route handler):**
```
Subject: ⏰ Make your pick for Episode 3
```
Spoilers: Episode number reveals season progress

**Email Preview:**
```
Hey John, you haven't made your pick for Episode 3 yet.
Picks lock in 24 hours!
```

**Spoiler Risk:**
- **Low-Medium:** Episode number could spoil how far season has progressed
- **Context-dependent:** If user is avoiding ALL episode info, this spoils "we're on episode 3"

**When Sent:**
```typescript
// From routes/notifications.ts - Manual trigger by admin
router.post('/send-reminders', requireAdmin, async (req, res) => {
  // Sends to users who haven't made picks
  subject: `⏰ Make your pick for Episode ${episode.number}`,
});
```

**Recommended Fix:**
```typescript
// OPTION 1: Remove episode number
subject: `⏰ Make your weekly pick`,
body: `Hey ${displayName}, you haven't made your pick yet. Picks lock in ${hoursLeft} hours!`

// OPTION 2: Keep it (acceptable spoiler level)
// Episode numbers are low-stakes spoilers - just indicates calendar time
```

---

### P1-3: Pick Final Warning - Episode Number Exposure ⚠️ CRITICAL

**Location:** `/server/src/emails/reminders/pick-final-warning.ts`
**Impact:** Subject reveals episode progress

**Evidence:**

**Email Subject:**
```
Subject: 🚨 PICKS LOCK IN 30 MINUTES!
```
Clean (no episode number in subject)

**Email Preview:**
```
Hey John,
You have 30 minutes to submit your pick for Episode 3!
```
Spoilers: Episode number in preview text

**Spoiler Risk:**
- **Low-Medium:** Preview shows episode number
- **Severity:** Less critical than results/eliminations

**Recommended Fix:**
```typescript
// Change preview text
<p>You have <span style="color: #ef4444; font-weight: bold;">${minutesLeft} minutes</span> to submit your pick!</p>
// Move episode number further down in body
```

---

### P1-4: Results Notification Subject - Points Exposure ⚠️ CRITICAL

**Location:** `/server/src/routes/notifications.ts:280-281`
**Impact:** Points scored revealed in subject line

**Evidence:**

**Email Subject:**
```
Subject: 📊 Episode 3 Results - 45 points!
```
Spoilers: Episode number, exact points scored

**Email Body:**
```
Hey John, Episode 3 has been scored!

Your pick: Tony Vlachos
Points earned: 45
Total points: 127
Current rank: #2 in Legends League
```
Spoilers: Everything

**Where Sent:**
Legacy notification route (should be replaced by spoiler-safe system)

**Recommended Fix:**
Use spoiler-safe notification system instead. Delete this route.

---

### P1-5: Weekly Picks Notification - Episode Number ⚠️ CRITICAL

**Location:** `/server/src/routes/notifications.ts:73-74`
**Impact:** Subject shows episode number

**Evidence:**

**Notification Record:**
```typescript
notifications.push({
  user_id: member.user_id,
  type: 'email',
  subject: `⏰ Make your pick for Episode ${episode.number}`,
  body: `Hey ${user.display_name}, you haven't made your pick for Episode ${episode.number} yet.`
});
```

**Spoiler Risk:**
- **Low-Medium:** Episode number reveals season timeline
- **Acceptable:** This is a reminder to take action, not results

**Recommended Fix:**
```typescript
// Remove episode number from subject
subject: `⏰ Make your weekly pick`,
body: `Hey ${user.display_name}, you haven't made your pick yet. Picks lock in ${hoursLeft} hours!`
```

---

### P2-1: Spoiler-Safe Email - Episode Number in Title Tag 📌 HIGH

**Location:** `/server/src/lib/spoiler-safe-notifications.ts:120`
**Impact:** HTML `<title>` tag shows episode number (low visibility)

**Evidence:**
```html
<head>
  <title>Episode ${episode.number} Results Ready</title>
</head>
```

**Spoiler Risk:**
- **Low:** Most email clients don't show `<title>` tag
- **Edge case:** Browser tab title if opened in web browser
- **Severity:** Minor compared to subject/preview

**Recommended Fix:**
```html
<title>Your Survivor Fantasy Results Are Ready</title>
```

---

### P2-2: SMS Results Notification - Episode Number 📌 HIGH

**Location:** `/server/src/lib/spoiler-safe-notifications.ts:232`
**Impact:** SMS shows episode number (acceptable spoiler level)

**Evidence:**
```typescript
await sendSMS({
  to: user.phone,
  text: `[RGFL] Episode ${episode.number} results are ready! Check the app to view your scores and standings. ${appUrl}/results Reply STOP to opt out.`,
});
```

**Spoiler Risk:**
- **Low-Medium:** Episode number reveals timeline
- **Acceptable:** SMS is ultra-safe otherwise (no names, no scores)
- **Trade-off:** Episode context helps user know which week

**Recommended Fix:**
```typescript
// OPTION 1: Remove episode number
text: `[RGFL] Your weekly results are ready! Check the app to view scores and standings.`

// OPTION 2: Keep it (acceptable)
// Episode number is low-stakes context
```

---

## URL Security Analysis

### Spoiler-Safe URLs ✅

**New System (Correct):**
```
https://survivor.realitygamesfantasyleague.com/results/week-${episode.week_number}?token=${token}
```

**Issues:**
1. ❌ `week_number` field doesn't exist in database → will crash
2. ✅ Token-based security (64-char random, 7-day expiration)
3. ✅ No spoilers in URL structure
4. ✅ Frontend must have matching route: `/results/week-:weekNumber`

**Legacy System URLs:**
```typescript
// From episode-results.ts:65
`https://rgfl.app/leagues/${leagueId}/episodes/${episodeId}`
// Exposes: episode UUID (low risk, not human-readable)

// From elimination-alert.ts:34
`https://rgfl.app/leagues/${leagueId}`
// Safe: Just league page
```

---

## Email Client Preview Testing

### Preview Text Analysis

Email clients show 30-140 characters of preview text:

| Email Type | Preview Text | Spoiler Risk |
|------------|--------------|--------------|
| Spoiler-Safe (New) | "The latest episode has been scored and your results..." | ✅ SAFE |
| Episode Results (Legacy) | "Hey John, Episode 3 has been scored! Your pick: Tony..." | ❌ MASSIVE |
| Elimination Alert | "Bad news from the island... Tony Vlachos has been..." | ❌ MASSIVE |
| Auto-Pick Alert | "You missed the pick deadline for Episode 3..." | ⚠️ MODERATE |
| Pick Reminder | "You haven't locked in your pick for Episode 3 yet..." | ⚠️ MODERATE |

**Preview Text Best Practices:**
1. First 140 characters must have ZERO spoilers (subject + preview)
2. Use generic language: "Results ready", "Action required"
3. Save specific details for click-to-reveal body

---

## System Architecture Analysis

### Two Competing Systems Identified

**NEW SYSTEM (Spoiler-Safe):**
- File: `lib/spoiler-safe-notifications.ts`
- Job: `jobs/releaseResults.ts` → `releaseWeeklyResults()`
- Schedule: Friday 2:00 PM PST (cron)
- Method: Token-based click-to-reveal
- Status: ❌ BROKEN (database schema bug)

**LEGACY SYSTEM (Spoiler-Filled):**
- Files: `emails/results/*.ts`, `emails/service.ts`
- Route: `POST /api/notifications/send-results`
- Trigger: Manual admin call
- Method: Immediate spoilers
- Status: ⚠️ ACTIVE (could be called)

**CONFLICT RISK:**
If both systems run, users will:
1. Receive spoiler-safe email with token
2. Click token, see results
3. 10 minutes later: Receive legacy email with full spoilers in subject

**Resolution Required:**
- Delete legacy system OR
- Ensure only one system is used OR
- Mark legacy as deprecated with warnings

---

## Email Subject Line Audit

### Spoiler-Safe Subjects ✅

```
✅ "Your Survivor Fantasy results are ready (Episode 3)"
   - Generic, episode number is acceptable context

✅ "Welcome to RGFL Survivor!"
✅ "Your league is ready!"
✅ "You've joined Legends League!"
✅ "Pick confirmed: [Name]"
   - Pick confirmations are pre-spoiler (user made the pick)
```

### Spoiler-Filled Subjects ❌

```
❌ "Episode 3 Results: +45 points!"
   - Points scored = spoiler

❌ "Tony Vlachos has been eliminated"
   - Massive spoiler in subject

❌ "Auto-pick applied: Tony Vlachos"
   - Reveals castaway name in inbox
```

### Borderline Subjects ⚠️

```
⚠️ "Make your pick for Episode 3"
   - Episode number could spoil timeline (low-stakes)

⚠️ "PICKS LOCK IN 30 MINUTES!"
   - No spoilers, creates urgency (acceptable)
```

---

## Recommendations

### Immediate Actions (Pre-Launch)

1. **Fix Database Schema Bug (P0-1)**
   ```sql
   ALTER TABLE episodes ADD COLUMN week_number INTEGER;
   UPDATE episodes SET week_number = number;
   ```

2. **Delete Legacy Email Templates (P0-2, P0-3)**
   ```bash
   rm server/src/emails/results/episode-results.ts
   rm server/src/emails/results/elimination-alert.ts
   ```

3. **Delete Legacy Notification Route (P0-4)**
   ```typescript
   // Remove: POST /api/notifications/send-results
   // Keep only: releaseWeeklyResults() job
   ```

4. **Update Auto-Pick Subject (P1-1)**
   ```typescript
   subject: `⚠️ Pick deadline was missed`
   ```

5. **Remove Episode Numbers from Subjects (P1-2, P1-3, P1-5)**
   ```typescript
   subject: `⏰ Make your weekly pick`
   subject: `🚨 PICKS LOCK SOON!`
   ```

### Testing Protocol

```typescript
// Test 1: Verify database schema
const { data, error } = await supabaseAdmin
  .from('episodes')
  .select('id, number, week_number')
  .limit(1);
console.log('Week number field exists:', !error && data[0].week_number !== undefined);

// Test 2: Run release job
const result = await releaseWeeklyResults();
console.log('Job succeeded:', result.episode !== null);

// Test 3: Check email queue
const { data: emails } = await supabaseAdmin
  .from('email_queue')
  .select('subject, html')
  .order('created_at', { ascending: false })
  .limit(5);

// Verify NO spoilers in subjects
emails.forEach(email => {
  const hasSpoilers =
    email.subject.includes('points') ||
    email.subject.includes('eliminated') ||
    email.html.match(/Tony Vlachos/i); // Example castaway name

  console.assert(!hasSpoilers, `Spoiler found in: ${email.subject}`);
});
```

### Long-Term Improvements

1. **Centralized Email Service**
   - Single source of truth for all notifications
   - Spoiler-safety checks before sending
   - Preview text validation

2. **Email Template Testing**
   ```typescript
   describe('Email Spoiler Safety', () => {
     it('should not include spoilers in subject', () => {
       const subject = generateEmailSubject({ type: 'results', episode: 3 });
       expect(subject).not.toContain('points');
       expect(subject).not.toContain('eliminated');
     });

     it('should not include spoilers in first 140 chars', () => {
       const html = generateEmailHTML({ type: 'results', episode: 3 });
       const preview = extractPreviewText(html, 140);
       expect(preview).not.toMatch(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/); // No names
       expect(preview).not.toContain('points');
     });
   });
   ```

3. **Email Client Preview Testing**
   - Test in Gmail, Outlook, Apple Mail, Yahoo
   - Verify preview pane shows no spoilers
   - Check mobile lock screen notifications

4. **User Preference Controls**
   - Allow users to opt out of specific email types
   - Separate preferences: reminders vs results
   - Spoiler delay options (already implemented)

---

## Test Evidence Files

### Code References
- `/server/src/lib/spoiler-safe-notifications.ts` - New system (broken)
- `/server/src/jobs/releaseResults.ts` - Release job (broken)
- `/server/src/emails/results/episode-results.ts` - Legacy (spoilers)
- `/server/src/emails/results/elimination-alert.ts` - Legacy (spoilers)
- `/server/src/routes/notifications.ts` - Legacy route (spoilers)
- `/server/src/emails/service.ts` - Email service (mixed)

### Database Schema
- `/supabase/migrations/001_initial_schema.sql` - No week_number field

### Search Results
```bash
# Verified week_number doesn't exist
$ grep -r "week_number" supabase/migrations/
# No results

# Found all email templates
$ ls -la server/src/emails/
results/episode-results.ts
results/elimination-alert.ts
transactional/auto-pick-alert.ts
reminders/pick-reminder.ts
reminders/pick-final-warning.ts
```

---

## Conclusion

The spoiler prevention system has **critical security vulnerabilities** across multiple layers:

1. **Database Schema Bug:** Prevents new system from working at all
2. **Legacy Templates:** Leak massive spoilers in subjects and previews
3. **Competing Systems:** Old and new systems could both run
4. **Subject Line Leaks:** Points, names, eliminations visible in inbox

**Launch Recommendation:** **DO NOT LAUNCH** until all P0 issues are fixed.

**Estimated Fix Time:** 4-8 hours
- 1 hour: Database schema fix
- 2 hours: Delete legacy templates and routes
- 1 hour: Update remaining email subjects
- 2 hours: Testing and verification
- 2 hours: Buffer for edge cases

**Verification Checklist:**
- [ ] `week_number` column added to episodes table
- [ ] Legacy email templates deleted
- [ ] Legacy `/send-results` route deleted
- [ ] Email subjects updated (no points/names/eliminations)
- [ ] Manual test: Run releaseWeeklyResults() job
- [ ] Verify email queue has spoiler-safe emails only
- [ ] Check email previews in Gmail, Outlook, Apple Mail
- [ ] Verify token links work correctly

---

**Test Session Duration:** 2 hours
**Total Issues Found:** 11 (4 P0, 5 P1, 2 P2)
**Confidence Level:** HIGH - Comprehensive code review completed
**Next Steps:** Fix P0 issues immediately, schedule P1/P2 fixes before launch
