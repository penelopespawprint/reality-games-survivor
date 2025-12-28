# Auto-Pick Job Exploratory Test Report

**Test Date:** December 27, 2025
**Tester:** QA Agent (Exploratory Testing Specialist)
**System Under Test:** Auto-Pick Job (`/server/src/jobs/autoPick.ts`)
**Job Schedule:** Wednesday 3:05 PM PST (5 minutes after picks lock)
**Test Duration:** ~90 minutes

---

## Executive Summary

**Overall Status:** ⚠️ CRITICAL ISSUES FOUND - Scheduled auto-pick job does NOT send notifications, despite email templates existing and being used in admin API route.

**Critical Findings:**
- ❌ **BLOCKER:** Scheduled auto-pick job (`/server/src/jobs/autoPick.ts`) does NOT send notifications when auto-pick happens
- ✅ Auto-pick alert email template exists and is implemented in admin API route (`/server/src/routes/picks.ts`)
- ✅ Torch snuffed (elimination) notifications ARE implemented with both email and SMS
- ✅ Status field correctly set to 'auto_picked' for auto-selected picks
- ⚠️ **CONCERN:** Auto-pick selection logic picks "first available" castaway, NOT highest-ranked (line 98)
- ⚠️ **ARCHITECTURE ISSUE:** TWO separate auto-pick implementations exist (scheduled job vs admin API route)

**CRITICAL DISCOVERY:**
There are TWO different auto-pick implementations in the codebase:
1. **Scheduled Job:** `/server/src/jobs/autoPick.ts` - Runs Wed 3:05pm PST (used in production) - ❌ NO NOTIFICATIONS
2. **Admin API Route:** `/server/src/routes/picks.ts` POST `/api/picks/auto-fill` - ✅ SENDS NOTIFICATIONS

The scheduled job (which runs automatically) does NOT send auto-pick alert notifications. Only the admin API route does.

**Test Coverage:**
- Code review: ✅ Complete
- Email template review: ✅ Complete
- Database schema review: ✅ Complete
- Live execution testing: ❌ BLOCKED (no test data)
- Email delivery testing: ❌ BLOCKED (requires live run)
- SMS delivery testing: ❌ BLOCKED (requires live run)

---

## Test Charter

**Mission:** Systematically test the auto-pick job to verify it:
1. Selects the highest-ranked available castaway from user's 2-person roster when they miss the deadline
2. Marks picks with `status: 'auto_picked'` in the database
3. Sends email/SMS notifications to users about their auto-pick
4. Detects users with 0 active castaways (both eliminated)
5. Sends "torch snuffed" email/SMS notifications to eliminated users
6. Marks eliminated users in league_members table with `eliminated_at` timestamp

**Time-box:** 90 minutes
**Focus Areas:**
- Notification delivery (email & SMS)
- Edge case handling (0 active castaways, all castaways eliminated)
- Data integrity (correct status, timestamps, elimination tracking)
- User experience (clear, actionable notifications)

---

## System Architecture Analysis

### Job Flow
```
Wednesday 3:00 PM PST  →  lock-picks job runs
Wednesday 3:05 PM PST  →  auto-pick job runs (5 min delay)

Auto-Pick Job Logic:
1. Find current episode where picks just locked
2. Get all active leagues for this season
3. For each league:
   a. Get members who haven't picked and aren't eliminated
   b. Get their active rosters (non-eliminated castaways)
   c. IF roster has 0 active castaways:
      - Mark user as eliminated (eliminated_at timestamp)
      - Send torch snuffed email (critical queue)
      - Send torch snuffed SMS (if enabled)
      - Log to notifications table
   d. ELSE:
      - Pick first available castaway (⚠️ NOT highest-ranked)
      - Create weekly_pick with status='auto_picked'
      - (⚠️ NO NOTIFICATION SENT)
4. Return stats (autoPicked count, eliminated count)
```

### Email Templates Found

#### 1. Auto-Pick Alert Email ✅
**File:** `/server/src/emails/transactional/auto-pick-alert.ts`
**Subject:** `⚠️ Auto-pick applied: {castawayName}`
**Content:**
- Warning header with amber/yellow styling
- Shows which castaway was auto-selected
- Shows episode number and league name
- Includes CTA button to view team
- Encourages SMS/push notification setup
- Professional, actionable, clear

**Assessment:** ✅ Well-designed, spoiler-free, actionable

#### 2. Torch Snuffed Email ✅
**File:** `/server/src/emails/transactional/torch-snuffed.ts`
**Subject:** `🔥 Your torch has been snuffed in {leagueName}`
**Content:**
- Dramatic "The tribe has spoken" header
- 🔥 flame emoji visual
- Clear explanation: "Both your castaways have been eliminated"
- Episode number reference
- What you can still do (view standings, chat, join other leagues)
- Empathetic tone with "better luck next season"
- CTA to view league standings

**Assessment:** ✅ Excellent UX - empathetic, clear, provides next steps

#### 3. Torch Snuffed SMS ✅
**Location:** `/server/src/jobs/autoPick.ts:182-186`
**Content:**
```
[RGFL] The tribe has spoken. Both your castaways have been eliminated from {leagueName}.
Your torch has been snuffed. You can still follow the leaderboard! Reply STOP to opt out.
```

**Assessment:** ✅ Concise, clear, includes STOP instruction (legal compliance)

---

## Code Review Findings

### ✅ STRENGTHS

1. **Elimination Detection Logic (Lines 76-94)**
   - Correctly filters roster to active castaways only
   - Handles empty roster case explicitly
   - Calls dedicated handler function for eliminated users
   - Logs elimination events for admin visibility
   - Continues to next user (doesn't crash)

2. **Email Delivery (Lines 164-177)**
   - Uses `EmailService.sendTorchSnuffed()` which uses `sendEmailCritical()`
   - Critical emails go through retry queue with exponential backoff
   - Catches and logs email errors without crashing job
   - Console logs for observability

3. **SMS Delivery (Lines 179-191)**
   - Checks `notification_sms` preference before sending
   - Verifies phone number exists
   - Uses `isTransactional: false` (correct - this is marketing, not auth)
   - Includes STOP instruction (FCC/TCPA compliance)
   - Catches and logs SMS errors without crashing job

4. **Database Updates**
   - Updates `league_members.eliminated_at` timestamp (line 141-144)
   - Logs to `notifications` table for admin visibility (line 194-200)
   - Proper error handling with early returns on failures

5. **Return Value Structure (Lines 11-16, 120-125)**
   - Returns structured object with counts and user arrays
   - Enables job monitoring and alerting
   - Provides visibility into job results

### ⚠️ CRITICAL ISSUES

#### ISSUE #1: Auto-Pick Does NOT Select Highest-Ranked Castaway ⚠️
**Location:** Line 97-98
**Code:**
```typescript
// Pick first available (could add ranking logic here)
const autoCastaway = activeCastaways[0];
```

**Problem:**
- Comment says "could add ranking logic here" - meaning it's NOT implemented!
- Code picks `activeCastaways[0]` which is just the first item in the array
- Array order is undefined (depends on database query order)
- **This violates the stated requirement:** "highest-ranked available castaway"

**Impact:** HIGH
Users expect their higher-performing or preferred castaway to be auto-selected. Instead, they get a random one based on database ordering.

**Recommendation:**
```typescript
// Need to:
// 1. Query draft_rankings table to get user's preference order
// 2. Sort activeCastaways by user's ranking
// 3. Pick the highest-ranked one
// OR
// 1. Query previous weeks' picks
// 2. Pick the castaway they DIDN'T play last week (alternate between 2)
```

#### ISSUE #2: No Notification Sent on Successful Auto-Pick ❌
**Location:** Lines 100-114
**Code:**
```typescript
// Create auto-pick
const { error } = await supabaseAdmin.from('weekly_picks').insert({
  league_id: league.id,
  user_id: member.user_id,
  episode_id: episode.id,
  castaway_id: autoCastaway.castaway_id,
  status: 'auto_picked',
  picked_at: now.toISOString(),
  locked_at: now.toISOString(),
});

if (!error) {
  autoPickedUsers.push(member.user_id);
}
```

**Problem:**
- Auto-pick is created in database
- User is added to `autoPickedUsers` array
- **BUT NO NOTIFICATION IS SENT!**
- The auto-pick email template exists (`auto-pick-alert.ts`)
- But it's never called in this code

**Impact:** CRITICAL
Users have NO IDEA an auto-pick was made for them. They'll be confused when they check the app and see a pick they didn't make.

**Expected Behavior:**
```typescript
if (!error) {
  autoPickedUsers.push(member.user_id);

  // Send notification about auto-pick
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email, display_name, phone, notification_email, notification_sms')
    .eq('id', member.user_id)
    .single();

  if (user?.notification_email) {
    await EmailService.sendAutoPickAlert({
      displayName: user.display_name,
      email: user.email,
      castawayName: autoCastaway.castaways.name,
      leagueName: league.name,
      leagueId: league.id,
      episodeNumber: episode.number,
    });
  }

  if (user?.notification_sms && user.phone) {
    await sendSMS({
      to: user.phone,
      text: `[RGFL] Auto-pick for Episode ${episode.number}: ${autoCastaway.castaways.name} selected for ${league.name}. Reply STOP to opt out.`,
      isTransactional: false,
    });
  }
}
```

#### ISSUE #3: Query Ordering is Undefined ⚠️
**Location:** Lines 68-73
**Code:**
```typescript
const { data: roster } = await supabaseAdmin
  .from('rosters')
  .select('castaway_id, castaways!inner(id, name, status)')
  .eq('league_id', league.id)
  .eq('user_id', member.user_id)
  .is('dropped_at', null);
```

**Problem:**
- No `.order()` clause specified
- PostgreSQL may return rows in any order
- This makes `activeCastaways[0]` completely unpredictable

**Recommendation:**
Add explicit ordering, even if just for consistency:
```typescript
.order('created_at', { ascending: true }) // First drafted castaway
```

---

## Test Scenarios & Results

### Scenario 1: User Misses Pick Deadline (Has 2 Active Castaways)

**Given:**
- User has 2 active castaways on roster
- User did not submit pick before Wednesday 3pm PST
- Picks are now locked

**Expected:**
1. Auto-pick job selects highest-ranked available castaway
2. Creates weekly_pick record with `status: 'auto_picked'`
3. Sets `picked_at` and `locked_at` timestamps
4. Sends email notification to user (if enabled)
5. Sends SMS notification to user (if enabled)

**Actual (Code Review):**
1. ❌ Selects first available (random), NOT highest-ranked
2. ✅ Creates weekly_pick with `status: 'auto_picked'`
3. ✅ Sets timestamps correctly
4. ❌ Does NOT send email notification
5. ❌ Does NOT send SMS notification

**Status:** ❌ FAILED - Missing notifications, wrong selection logic

---

### Scenario 2: User Misses Pick Deadline (Has 1 Active Castaway)

**Given:**
- User has 1 active castaway (the other was eliminated)
- User did not submit pick before Wednesday 3pm PST

**Expected:**
1. Auto-pick job selects the only active castaway
2. Creates weekly_pick record with `status: 'auto_picked'`
3. Sends notification

**Actual (Code Review):**
1. ✅ Selects the only available castaway (activeCastaways[0])
2. ✅ Creates weekly_pick record correctly
3. ❌ Does NOT send notification

**Status:** ⚠️ PARTIAL PASS - Works but no notification

---

### Scenario 3: User Misses Pick Deadline (Has 0 Active Castaways - Torch Snuffed)

**Given:**
- User's last active castaway was eliminated in previous episode
- User now has 0 active castaways
- User did not submit pick (impossible anyway)

**Expected:**
1. Job detects 0 active castaways
2. Marks user as eliminated (`league_members.eliminated_at = NOW()`)
3. Sends "torch snuffed" email (if enabled)
4. Sends "torch snuffed" SMS (if enabled)
5. Logs notification to database
6. Does NOT create weekly_pick (impossible with no castaways)

**Actual (Code Review):**
1. ✅ Detects empty roster (line 80)
2. ✅ Calls `handleEliminatedUser()` function
3. ✅ Updates `eliminated_at` timestamp (line 141)
4. ✅ Sends email via `EmailService.sendTorchSnuffed()` (line 166)
5. ✅ Sends SMS if enabled (line 182)
6. ✅ Logs to notifications table (line 194)
7. ✅ Uses `continue` to skip pick creation (line 94)

**Status:** ✅ PASS - Excellent implementation!

---

### Scenario 4: User Already Submitted Pick

**Given:**
- User submitted pick on Tuesday
- Auto-pick job runs Wednesday 3:05pm

**Expected:**
- User is excluded from auto-pick processing

**Actual (Code Review):**
```typescript
const { data: existingPicks } = await supabaseAdmin
  .from('weekly_picks')
  .select('user_id')
  .eq('league_id', league.id)
  .eq('episode_id', episode.id);

const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) || []);
const missingUsers = members?.filter(
  (m) => !pickedUserIds.has(m.user_id) && !m.eliminated_at
) || [];
```

**Status:** ✅ PASS - Correctly filters out users who already picked

---

### Scenario 5: User Already Eliminated (From Previous Episode)

**Given:**
- User was eliminated in Episode 5
- Auto-pick job runs for Episode 6

**Expected:**
- User is excluded from processing (no duplicate notifications)

**Actual (Code Review):**
```typescript
const missingUsers = members?.filter(
  (m) => !pickedUserIds.has(m.user_id) && !m.eliminated_at
) || [];
```

**Status:** ✅ PASS - Filters out users where `eliminated_at IS NOT NULL`

---

### Scenario 6: User Has Email Disabled, SMS Enabled

**Given:**
- User's `notification_email = false`
- User's `notification_sms = true`
- User is eliminated (torch snuffed)

**Expected:**
- Email is NOT sent
- SMS is sent

**Actual (Code Review):**
```typescript
if (user.notification_email) {
  await EmailService.sendTorchSnuffed(...);
}

if (user.notification_sms && user.phone) {
  await sendSMS(...);
}
```

**Status:** ✅ PASS - Respects user preferences

---

### Scenario 7: Email Service Failure (Network Error)

**Given:**
- User is eliminated
- Email service throws error (network timeout, API error, etc.)

**Expected:**
- Error is caught and logged
- Job continues processing other users
- Job does NOT crash

**Actual (Code Review):**
```typescript
try {
  await EmailService.sendTorchSnuffed(...);
  console.log(`[AutoPick] Torch snuffed email sent to ${user.email}`);
} catch (emailError) {
  console.error(`Failed to send torch snuffed email to ${user.email}:`, emailError);
}
```

**Status:** ✅ PASS - Graceful error handling

---

### Scenario 8: SMS Service Failure (Invalid Phone Number)

**Given:**
- User's phone number is invalid or SMS service fails

**Expected:**
- Error is caught and logged
- Job continues
- Job does NOT crash

**Actual (Code Review):**
```typescript
try {
  await sendSMS(...);
  console.log(`[AutoPick] Torch snuffed SMS sent to ${user.phone}`);
} catch (smsError) {
  console.error(`Failed to send torch snuffed SMS to ${user.phone}:`, smsError);
}
```

**Status:** ✅ PASS - Graceful error handling

---

### Scenario 9: Database Query Failure

**Given:**
- Supabase query fails (network, permissions, etc.)

**Expected:**
- Job returns empty results
- Job does NOT crash

**Actual (Code Review):**
```typescript
const { data: episodes } = await supabaseAdmin
  .from('episodes')
  .select('id, season_id, number')
  .lte('picks_lock_at', now.toISOString())
  .eq('is_scored', false)
  .order('picks_lock_at', { ascending: false })
  .limit(1);

const episode = episodes?.[0];
if (!episode) {
  return { autoPicked: 0, users: [], eliminated: 0, eliminatedUsers: [] };
}
```

**Status:** ✅ PASS - Early return with empty results

**BUT:** No error logging! If query actually fails (not just empty), errors are silently swallowed.

---

### Scenario 10: Multiple Leagues, Mixed States

**Given:**
- User is in League A (has 2 active castaways, missed pick)
- User is in League B (already picked)
- User is in League C (eliminated last week)

**Expected:**
- League A: Auto-pick created
- League B: Skipped (already picked)
- League C: Skipped (already eliminated)

**Actual (Code Review):**
```typescript
for (const league of leagues) {
  // Get members who haven't picked and aren't already eliminated
  const { data: members } = await supabaseAdmin
    .from('league_members')
    .select('user_id, eliminated_at')
    .eq('league_id', league.id);

  const { data: existingPicks } = await supabaseAdmin
    .from('weekly_picks')
    .select('user_id')
    .eq('league_id', league.id)
    .eq('episode_id', episode.id);

  const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) || []);
  const missingUsers = members?.filter(
    (m) => !pickedUserIds.has(m.user_id) && !m.eliminated_at
  ) || [];
```

**Status:** ✅ PASS - Correctly processes per-league state

---

## Email Template Quality Assessment

### Auto-Pick Alert Email

**Template:** `/server/src/emails/transactional/auto-pick-alert.ts`

**Strengths:**
- ✅ Clear subject line: "Auto-pick applied: {castawayName}"
- ✅ Explains what happened: "You missed the pick deadline"
- ✅ Shows which castaway was selected
- ✅ Amber/yellow warning styling (appropriate urgency)
- ✅ CTA to view team
- ✅ Encourages SMS setup to prevent future misses
- ✅ Professional, empathetic tone

**Weaknesses:**
- Line 19: Says "highest-performing active castaway" - but code picks FIRST, not highest-performing
- Could mention deadline time for clarity

**Overall:** ✅ EXCELLENT - Minor copy fix needed to match implementation

---

### Torch Snuffed Email

**Template:** `/server/src/emails/transactional/torch-snuffed.ts`

**Strengths:**
- ✅ Dramatic, memorable "The tribe has spoken" opening
- ✅ 🔥 Flame emoji creates visual impact
- ✅ Crystal clear message: "Both your castaways have been eliminated"
- ✅ Empathetic tone
- ✅ Provides what user CAN still do (view standings, chat, join other leagues)
- ✅ CTA to view league standings
- ✅ Encourages continued engagement despite elimination
- ✅ Survivor-themed copy throughout

**Weaknesses:**
- None identified

**Overall:** ✅ OUTSTANDING - Best-in-class elimination notification

---

## Database Schema Review

### weekly_picks Table

**Relevant Fields:**
- `status` ENUM: `'pending' | 'locked' | 'auto_picked'` ✅
- `picked_at` TIMESTAMPTZ ✅
- `locked_at` TIMESTAMPTZ ✅
- UNIQUE constraint on `(league_id, user_id, episode_id)` ✅

**Assessment:** ✅ Schema supports auto-pick functionality correctly

---

### league_members Table (Migration 026)

**Relevant Fields:**
- `eliminated_at` TIMESTAMPTZ (nullable) ✅
- Constraint: `eliminated_at <= NOW()` ✅
- Index on `(league_id, eliminated_at) WHERE eliminated_at IS NULL` ✅
- Comment: Clear explanation of field purpose ✅

**Assessment:** ✅ Excellent schema design for elimination tracking

---

## Notification Preferences Review

**Location:** `/server/src/emails/service.ts`

### Auto-Pick Alert (Lines 619-626)
```typescript
static async sendAutoPickAlert(data: AutoPickAlertEmailData): Promise<boolean> {
  const html = autoPickAlertEmailTemplate(data);
  return sendEmail({
    to: data.email,
    subject: `⚠️ Auto-pick applied: ${data.castawayName}`,
    html,
  });
}
```

**Assessment:** ✅ Uses standard `sendEmail()` (not critical queue)
**Reasoning:** Auto-pick alerts are informational, not transactional - appropriate priority

---

### Torch Snuffed (Lines 722-730)
```typescript
static async sendTorchSnuffed(data: TorchSnuffedEmailData): Promise<boolean> {
  const html = torchSnuffedEmailTemplate(data);
  return sendEmailCritical({
    to: data.email,
    subject: `🔥 Your torch has been snuffed in ${data.leagueName}`,
    html,
  });
}
```

**Assessment:** ✅ Uses `sendEmailCritical()` with retry queue
**Reasoning:** Elimination is critical - user needs to know they can't compete anymore

---

## Performance & Scalability Analysis

### Query Performance

**Potential Issues:**

1. **N+1 Query Problem (Lines 47-114)**
```typescript
for (const league of leagues) {
  // Query 1: Get members
  const { data: members } = await supabaseAdmin
    .from('league_members')
    .select('user_id, eliminated_at')
    .eq('league_id', league.id);

  // Query 2: Get existing picks
  const { data: existingPicks } = await supabaseAdmin
    .from('weekly_picks')
    .select('user_id')
    .eq('league_id', league.id)
    .eq('episode_id', episode.id);

  for (const member of missingUsers) {
    // Query 3: Get roster (for EACH missing user)
    const { data: roster } = await supabaseAdmin
      .from('rosters')
      .select('castaway_id, castaways!inner(id, name, status)')
      .eq('league_id', league.id)
      .eq('user_id', member.user_id)
      .is('dropped_at', null);
  }
}
```

**Problem:**
- If 100 leagues exist
- Each has 12 members
- 50% missed picks (6 per league)
- **Total queries:** 100 (members) + 100 (picks) + 600 (rosters) = **800 queries**

**Impact:** MEDIUM
For 1000+ leagues, this job could take several minutes and strain database

**Recommendation:**
Batch roster queries using `IN` clause:
```typescript
const allMissingUserIds = missingUsers.map(m => m.user_id);
const { data: allRosters } = await supabaseAdmin
  .from('rosters')
  .select('user_id, castaway_id, castaways!inner(id, name, status)')
  .eq('league_id', league.id)
  .in('user_id', allMissingUserIds)
  .is('dropped_at', null);
```

---

## Edge Cases & Boundary Conditions

### ✅ Handled Correctly

1. **Empty leagues** - Loop continues, no crash
2. **All users picked** - `missingUsers` is empty array, loop skips
3. **User has 0 castaways** - Handled with elimination flow
4. **Email/SMS disabled** - Checked before sending
5. **Email/SMS service failures** - Caught, logged, job continues
6. **Invalid phone numbers** - SMS error caught, logged
7. **User already eliminated** - Filtered out early
8. **Multiple leagues per user** - Processed independently per league

### ⚠️ Potentially Problematic

1. **Episode not found** (line 29-31) - Returns empty results with no logging
2. **No active leagues** (line 40-42) - Returns empty results with no logging
3. **Database query failures** - Errors silently swallowed (no explicit error handling)

---

## Security & Privacy Analysis

### ✅ Secure Practices

1. **Service role usage** - Uses `supabaseAdmin` (has bypass RLS)
2. **No PII in logs** - Logs user IDs, not emails/phones
3. **Notification preferences respected** - Checks before sending
4. **STOP instruction in SMS** - Legal compliance (FCC/TCPA)

### ⚠️ Privacy Concerns

1. **SMS is marked non-transactional** (line 185)
   - `isTransactional: false` means marketing/promotional
   - This is CORRECT for elimination notifications (not auth/security)
   - User can opt out via STOP

---

## Usability & User Experience

### ✅ Excellent UX

1. **Torch snuffed email** - Empathetic, clear, provides next steps
2. **Email styling** - Amber warnings for auto-pick, red for elimination
3. **Actionable CTAs** - "View Your Team", "View League Standings"
4. **Encourages engagement** - "Keep watching!", "Join other leagues"

### ❌ Poor UX

1. **No notification for auto-pick** - User has no idea it happened
2. **Random castaway selection** - Not highest-ranked as expected

---

## Recommendations

### PRIORITY 1 (Critical - Must Fix Before Launch)

1. **Add Auto-Pick Notifications**
   - Send email/SMS when auto-pick is created
   - Use existing `auto-pick-alert.ts` template
   - Check notification preferences
   - Handle errors gracefully

2. **Implement Highest-Ranked Selection**
   - Query `draft_rankings` table to get user's preference order
   - Sort active castaways by user's ranking
   - Select highest-ranked one
   - OR: Alternate between 2 castaways (pick the one NOT played last week)

3. **Fix Email Template Copy**
   - Change "highest-performing" to match actual implementation
   - OR: Implement highest-ranked selection and keep copy

### PRIORITY 2 (High - Should Fix Soon)

1. **Add Error Logging**
   - Log when no episode found
   - Log when no active leagues found
   - Log database query failures (not just empty results)
   - Send admin alerts on repeated failures

2. **Optimize Query Performance**
   - Batch roster queries instead of N+1 loop
   - Add database indexes if needed
   - Monitor execution time in production

3. **Add Idempotency Check**
   - Prevent duplicate auto-picks if job runs twice
   - Check for existing auto-picks before creating

### PRIORITY 3 (Medium - Nice to Have)

1. **Add Job Metrics**
   - Track execution time
   - Track auto-pick rate (% of users who missed deadline)
   - Track elimination rate
   - Dashboard visualization

2. **Improve Console Logging**
   - Add timestamps
   - Add league/user counts
   - Add structured logging (JSON format for parsing)

---

## Test Data Needed for Full Verification

To fully test this job, we need:

1. **Database Setup:**
   - Active season with episodes
   - Multiple leagues (free, paid, different sizes)
   - Users with various roster states:
     - 2 active castaways
     - 1 active castaway
     - 0 active castaways
   - Episode with `picks_lock_at` in the past
   - Some users with picks, some without

2. **Notification Setup:**
   - Test users with email enabled
   - Test users with SMS enabled
   - Test users with both disabled
   - Valid phone numbers for SMS testing
   - Email service configured (Resend API key)
   - SMS service configured (Twilio credentials)

3. **Execution Environment:**
   - Access to run job manually: `runJob('auto-pick')`
   - Ability to inspect database before/after
   - Access to email/SMS logs
   - Monitoring dashboard

---

## Conclusion

**Overall Assessment:** ⚠️ PARTIAL IMPLEMENTATION - Core functionality exists but has critical gaps

**Strengths:**
- ✅ Elimination detection and notification is EXCELLENT
- ✅ Email templates are professional and empathetic
- ✅ Error handling prevents job crashes
- ✅ Database schema supports all requirements
- ✅ Respects user notification preferences

**Critical Gaps:**
- ❌ Auto-pick selection logic does NOT pick highest-ranked castaway
- ❌ Auto-pick notifications are NOT sent (template exists but never called)
- ⚠️ N+1 query performance issue at scale
- ⚠️ Missing error logging for database failures

**Recommendation:**
**DO NOT LAUNCH** until Priority 1 issues are fixed:
1. Add auto-pick notifications
2. Implement highest-ranked selection OR update email template copy
3. Add comprehensive error logging

**Estimated Fix Time:** 4-6 hours
**Risk Level if Unfixed:** HIGH - Users will be confused and frustrated

---

## Appendix A: Files Reviewed

- `/server/src/jobs/autoPick.ts` (209 lines) - **SCHEDULED JOB (production)**
- `/server/src/routes/picks.ts` (410 lines) - Contains admin API `/api/picks/auto-fill` endpoint
- `/server/src/jobs/scheduler.ts` (348 lines)
- `/server/src/emails/transactional/auto-pick-alert.ts` (33 lines)
- `/server/src/emails/transactional/torch-snuffed.ts` (54 lines)
- `/server/src/emails/service.ts` (754 lines)
- `/server/src/config/twilio.ts` (SMS integration)
- `/supabase/migrations/001_initial_schema.sql` (weekly_picks table)
- `/supabase/migrations/026_league_members_elimination_tracking.sql`
- `/ELIMINATION_NOTIFICATION_FIX.md` (211 lines) - Documentation of torch snuffed feature

**Total Lines Reviewed:** ~2,172 lines of code

## Appendix C: Architecture Confusion - Duplicate Auto-Pick Logic

### Two Implementations Discovered

#### 1. Scheduled Job (Production)
**File:** `/server/src/jobs/autoPick.ts`
**Trigger:** Cron schedule - Wed 3:05pm PST
**Imported by:** `/server/src/jobs/scheduler.ts` line 3
**Features:**
- ✅ Detects eliminated users (0 active castaways)
- ✅ Sends torch snuffed email/SMS
- ✅ Marks users as eliminated in database
- ❌ Does NOT send auto-pick alert email
- ❌ Does NOT send auto-pick SMS
- ❌ Returns structured result object

**Code Structure:**
```typescript
export async function autoPick(): Promise<{
  autoPicked: number;
  users: string[];
  eliminated: number;
  eliminatedUsers: string[];
}>
```

#### 2. Admin API Route (Manual Trigger Only)
**File:** `/server/src/routes/picks.ts` lines 267-407
**Trigger:** Manual POST request to `/api/picks/auto-fill` (requires admin auth)
**Route:** `POST /api/picks/auto-fill`
**Features:**
- ✅ Sends auto-pick alert email (lines 377-384)
- ✅ Logs notification to database (lines 386-391)
- ✅ Fire-and-forget async email sending (line 348)
- ❌ Does NOT detect eliminated users
- ❌ Does NOT send torch snuffed notifications
- ❌ Does NOT check notification preferences (SMS)

**Code Structure:**
```typescript
router.post('/auto-fill', requireAdmin, async (req, res) => {
  // ... auto-pick logic ...

  // Send emails in background (fire and forget)
  (async () => {
    for (const autoPick of autoPicks) {
      await EmailService.sendAutoPickAlert({ ... });
    }
  })();
})
```

### Comparison Table

| Feature | Scheduled Job (`autoPick.ts`) | Admin API Route (`picks.ts`) |
|---------|------------------------------|------------------------------|
| Runs automatically | ✅ Yes (Wed 3:05pm PST) | ❌ No (manual admin trigger) |
| Auto-pick alert email | ❌ Not sent | ✅ Sent |
| Auto-pick SMS | ❌ Not sent | ❌ Not sent |
| Torch snuffed email | ✅ Sent | ❌ Not detected |
| Torch snuffed SMS | ✅ Sent | ❌ Not detected |
| Elimination detection | ✅ Yes | ❌ No |
| Database elimination tracking | ✅ Yes (`eliminated_at`) | ❌ No |
| Notification preferences check | ✅ Yes (email/SMS) | ⚠️ Partial (email only) |
| Fire-and-forget email | ❌ No (blocking) | ✅ Yes (async) |
| Error handling | ✅ Try/catch | ✅ Try/catch |
| Admin monitoring | ✅ Returns structured result | ✅ Returns auto_picked count |

### Root Cause Analysis

**Why do two implementations exist?**

1. **Historical Evolution:**
   - API route was likely created first for manual admin control
   - Scheduled job added later to automate the process
   - Email notifications were only implemented in the API route
   - Scheduled job added elimination detection (more sophisticated)
   - Code was never consolidated

2. **Feature Drift:**
   - Scheduled job focused on elimination detection
   - API route focused on notification sending
   - Neither has complete feature set

3. **Documentation Gap:**
   - No architecture doc explaining which to use
   - Scheduler uses scheduled job (correct for production)
   - Admin API exists but isn't documented in `/CLAUDE.md`

### Impact on Production

**Current State:**
- ✅ Auto-picks ARE created in database (both implementations work)
- ✅ Eliminated users ARE detected and notified (scheduled job)
- ❌ Users who get auto-picks receive NO notification (scheduled job missing feature)
- ⚠️ Admin can manually trigger auto-fill via API (but shouldn't need to)

**User Experience Impact:**
```
SCENARIO: User misses Wednesday pick deadline

Current behavior:
1. Wed 3:05pm - Scheduled job runs
2. Auto-pick is created in database
3. User sees pick when they log in
4. NO EMAIL SENT ❌
5. NO SMS SENT ❌
6. User is confused: "I didn't make this pick?"

Expected behavior:
1. Wed 3:05pm - Scheduled job runs
2. Auto-pick is created in database
3. Email sent: "Auto-pick applied: {castaway}" ✅
4. SMS sent (if enabled): "Auto-pick for Episode {X}: {castaway}" ✅
5. User is informed before they even check the app
```

### Recommendation: Consolidate Implementations

**Option 1: Fix Scheduled Job (Recommended)**
- Add auto-pick notification sending to `/server/src/jobs/autoPick.ts`
- Keep all logic in one place
- Deprecate admin API route (or make it call the scheduled job function)

**Option 2: Use Admin API Route from Scheduler**
- Update scheduler to call the admin API route internally
- Requires authentication bypass or service role
- More complex, not recommended

**Option 3: Create Shared Module**
- Extract auto-pick logic to `/server/src/lib/auto-pick-handler.ts`
- Both scheduled job and API route call shared module
- Best long-term solution but most work

---

## Appendix B: Suggested Test Script

```typescript
// Test Auto-Pick Job
// Run with: node --loader ts-node/esm test-auto-pick.ts

import { runJob } from './src/jobs/scheduler.js';
import { supabaseAdmin } from './src/config/supabase.js';

async function testAutoPick() {
  console.log('=== Auto-Pick Job Test ===\n');

  // 1. Setup: Find test league and episode
  const { data: episode } = await supabaseAdmin
    .from('episodes')
    .select('id, number, season_id')
    .eq('is_scored', false)
    .single();

  if (!episode) {
    console.error('No episode found');
    return;
  }

  console.log(`Testing with Episode ${episode.number}`);

  // 2. Pre-check: Count users without picks
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('season_id', episode.season_id);

  let totalMissing = 0;
  for (const league of leagues || []) {
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select('user_id')
      .eq('league_id', league.id);

    const { data: picks } = await supabaseAdmin
      .from('weekly_picks')
      .select('user_id')
      .eq('league_id', league.id)
      .eq('episode_id', episode.id);

    const missing = (members?.length || 0) - (picks?.length || 0);
    totalMissing += missing;
    console.log(`League "${league.name}": ${missing} missing picks`);
  }

  console.log(`\nTotal users missing picks: ${totalMissing}\n`);

  // 3. Run job
  console.log('Running auto-pick job...\n');
  const result = await runJob('auto-pick');

  // 4. Results
  console.log('=== Job Results ===');
  console.log(`Auto-picked: ${result.autoPicked} users`);
  console.log(`Eliminated: ${result.eliminated} users`);
  console.log('\nAuto-picked users:', result.users);
  console.log('Eliminated users:', result.eliminatedUsers);

  // 5. Verify database
  const { data: autoPicks } = await supabaseAdmin
    .from('weekly_picks')
    .select('user_id, castaway_id, status')
    .eq('episode_id', episode.id)
    .eq('status', 'auto_picked');

  console.log(`\nVerification: ${autoPicks?.length} auto-picks in database`);

  const { data: eliminated } = await supabaseAdmin
    .from('league_members')
    .select('user_id, eliminated_at')
    .not('eliminated_at', 'is', null);

  console.log(`Verification: ${eliminated?.length} eliminated users in database`);
}

testAutoPick().catch(console.error);
```

---

**End of Report**
