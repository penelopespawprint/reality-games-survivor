# QA Test Report: User Notification Preferences

**Test Charter:** Validate user notification preference management system
**Tester:** Exploratory QA Agent
**Date:** December 27, 2025
**Duration:** 60 minutes
**Status:** CRITICAL BUGS FOUND

---

## Executive Summary

Conducted comprehensive exploratory testing of the notification preferences system, examining database schema, API endpoints, UI implementation, and preference enforcement. **Found 5 critical architectural issues** that create data inconsistency, user confusion, and unreliable notification delivery.

### Test Coverage
- Database schema analysis (users table + notification_preferences table)
- Frontend UI implementation (Profile.tsx, Notifications.tsx)
- Backend API endpoints (PATCH /api/me/notifications)
- Notification enforcement logic (spoiler-safe-notifications.ts)
- Edge cases and boundary conditions

### Critical Findings Summary
- **P0 BLOCKER:** Dual storage system creates data inconsistency
- **P0 BLOCKER:** Missing spoiler delay UI/API implementation
- **P1 HIGH:** Profile page bypasses API validation
- **P1 HIGH:** No RLS policies on notification_preferences table
- **P2 MEDIUM:** Inconsistent field naming causes confusion

---

## Architecture Overview

### Database Schema

**Users Table (Legacy Storage):**
```sql
notification_email BOOLEAN DEFAULT TRUE
notification_sms BOOLEAN DEFAULT FALSE
notification_push BOOLEAN DEFAULT TRUE
```

**notification_preferences Table (New Storage):**
```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_results BOOLEAN DEFAULT true,
  sms_results BOOLEAN DEFAULT true,
  push_results BOOLEAN DEFAULT true,
  spoiler_delay_hours INTEGER DEFAULT 0 CHECK (spoiler_delay_hours >= 0 AND spoiler_delay_hours <= 72),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
```sql
-- Users can view own notification preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update own notification preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

**Missing RLS Policy:** No INSERT policy exists!

---

## Critical Issues Found

### P0 BLOCKER #1: Dual Storage System Creates Data Inconsistency

**Severity:** CRITICAL - Data integrity violation
**Impact:** Users' notification preferences may be ignored or incorrectly applied

**Problem:**
The system has TWO separate storage locations for notification preferences:

1. **users table** (legacy): `notification_email`, `notification_sms`, `notification_push`
2. **notification_preferences table** (new): `email_results`, `sms_results`, `push_results`, `spoiler_delay_hours`

**Evidence from code:**

**Frontend writes to users table:**
```typescript
// Profile.tsx lines 104-122
const updateNotifications = useMutation({
  mutationFn: async (updates: {
    notification_email?: boolean;
    notification_sms?: boolean;
    notification_push?: boolean;
  }) => {
    const { error } = await supabase.from('users').update(updates).eq('id', authUser.id);
    // WRITES TO USERS TABLE
  }
});
```

**Backend reads from BOTH tables with fallback:**
```typescript
// spoiler-safe-notifications.ts lines 38-67
async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  // First check notification_preferences table (new system)
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('email_results, sms_results, push_results')
    .eq('user_id', userId)
    .single();

  if (!error && data) {
    return data as NotificationPreferences;
  }

  // Fallback: check users table for legacy flags
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('notification_email, notification_sms, notification_push')
    .eq('id', userId)
    .single();

  // Returns DIFFERENT data depending on which table has data
}
```

**Failure Scenarios:**

1. **New user flow:**
   - User signs up → trigger creates record in `notification_preferences` table
   - User toggles email off in Profile page → writes to `users.notification_email = false`
   - Results release job runs → reads `notification_preferences.email_results = true` (still default!)
   - User receives email despite opting out

2. **Legacy user flow:**
   - Existing user has `users.notification_email = false`
   - Trigger backfills `notification_preferences.email_results = true` (default)
   - Results release job reads notification_preferences first
   - User receives emails despite previously opting out

3. **Race condition:**
   - Two systems updating different tables simultaneously
   - No synchronization mechanism
   - Last write wins, but to different tables

**Root Cause:**
Migration 022 created new table but didn't migrate frontend or provide sync mechanism.

**Impact Assessment:**
- Users who opt out may still receive notifications (privacy violation)
- Users who opt in may not receive notifications (broken functionality)
- No way to reconcile conflicts between tables
- Admin dashboard shows stats from users table, not notification_preferences table

**Recommendations:**
1. **Immediate:** Pick ONE source of truth (recommendation: notification_preferences)
2. **Update all frontend code** to write to notification_preferences table only
3. **Update backend API** to write to notification_preferences table only
4. **Data migration:** Copy all current users.notification_* values to notification_preferences
5. **Deprecate users table columns** after migration complete

---

### P0 BLOCKER #2: Missing Spoiler Delay Implementation

**Severity:** CRITICAL - Advertised feature completely missing
**Impact:** Users cannot set spoiler delay, defeating purpose of spoiler-safe system

**Problem:**
Database schema includes `spoiler_delay_hours` field with full constraints, but ZERO implementation:

**Schema declares feature:**
```sql
spoiler_delay_hours INTEGER DEFAULT 0 CHECK (spoiler_delay_hours >= 0 AND spoiler_delay_hours <= 72)
```

**Frontend has NO UI for setting this value:**
- Profile.tsx: No spoiler delay controls
- Notifications.tsx: No spoiler delay controls
- No UI component exists for this setting

**Backend has NO API endpoint:**
- No PATCH endpoint accepts spoiler_delay_hours
- notificationPrefsSchema only validates email/sms/push
- No validation for spoiler_delay_hours exists

**Notification system NEVER USES the field:**
```typescript
// spoiler-safe-notifications.ts
// getNotificationPreferences() returns email_results, sms_results, push_results
// but spoiler_delay_hours is NEVER queried or returned!

interface NotificationPreferences {
  email_results: boolean;
  sms_results: boolean;
  push_results: boolean;
  // spoiler_delay_hours is missing!
}
```

**Impact:**
- Database migration created table with unused column
- User expectation: "I can delay spoiler notifications 0-72 hours"
- Reality: Setting does nothing, always sends immediately
- Friday 2pm release job sends to ALL users regardless of delay preference

**Evidence from Requirements:**
CLAUDE.md states: "Spoiler delay (0-72 hours)" as a user preference feature.

**Recommendations:**
1. **Add UI controls** to Profile/Notifications pages for spoiler delay
2. **Extend notificationPrefsSchema** to include spoiler_delay_hours validation
3. **Update API endpoint** PATCH /api/me/notifications to accept spoiler_delay_hours
4. **Modify sendSpoilerSafeNotification()** to respect delay preference
5. **Update releaseResults job** to schedule delayed notifications instead of immediate send

---

### P1 HIGH #3: Frontend Bypasses API Validation

**Severity:** HIGH - Security and data integrity risk
**Impact:** Client can write invalid data directly to database

**Problem:**
Profile page writes directly to Supabase users table, bypassing Express API validation:

**Profile.tsx lines 104-122:**
```typescript
const updateNotifications = useMutation({
  mutationFn: async (updates: {
    notification_email?: boolean;
    notification_sms?: boolean;
    notification_push?: boolean;
  }) => {
    // DIRECT DATABASE WRITE - NO API VALIDATION
    const { error } = await supabase.from('users').update(updates).eq('id', authUser.id);
    if (error) throw error;
  }
});
```

**Backend has proper validation endpoint:**
```typescript
// auth.ts line 239
router.patch('/me/notifications', authenticate, validate(notificationPrefsSchema), async (...) => {
  // Validates input
  // Checks phone verification before enabling SMS
  // Uses service role for atomic updates
});
```

**But frontend NEVER CALLS IT!**

**Security Risks:**

1. **Phone verification bypass:**
   - Backend checks: "If enabling SMS, verify phone first"
   - Frontend direct write: No check, can enable SMS without verified phone
   - Result: System tries to send SMS to unverified/invalid numbers

2. **Type coercion attacks:**
   - Frontend could send strings instead of booleans
   - No Zod validation on client-side
   - Database might accept incorrect types

3. **RLS policy reliance:**
   - Security depends ONLY on Postgres RLS
   - No application-layer validation
   - If RLS has bug, data corruption possible

**Evidence of broken validation:**

Backend validation (auth.ts lines 249-262):
```typescript
// If enabling SMS, check phone is verified
if (sms === true) {
  const { data: user } = await supabase
    .from('users')
    .select('phone, phone_verified')
    .eq('id', userId)
    .single();

  if (!user?.phone_verified) {
    return res.status(400).json({
      error: 'Please verify your phone number first to enable SMS notifications',
    });
  }
}
```

Frontend bypasses this completely!

**Comparison:**
- Phone updates: Uses API endpoint `/me/phone` (secure)
- Notification preferences: Direct database write (insecure)

**Recommendations:**
1. **Refactor Profile.tsx** to call `PATCH /api/me/notifications` instead of direct Supabase
2. **Remove users table UPDATE permission** from RLS policy for notification columns
3. **Add backend-only UPDATE policy** requiring service role
4. **Test phone verification enforcement** after fix

---

### P1 HIGH #4: Missing INSERT Policy on notification_preferences

**Severity:** HIGH - Data integrity and privacy risk
**Impact:** Trigger creates records, but no INSERT policy exists for verification

**Problem:**
Schema has RLS policies for SELECT and UPDATE, but missing INSERT:

**Existing policies (migration 022):**
```sql
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

**Missing policy:**
```sql
-- DOES NOT EXIST!
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Why this matters:**

1. **Trigger uses SECURITY DEFINER:**
   ```sql
   CREATE OR REPLACE FUNCTION create_notification_preferences_for_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO notification_preferences (user_id)
     VALUES (NEW.id)
     ON CONFLICT (user_id) DO NOTHING;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;  -- Bypasses RLS!
   ```

2. **SECURITY DEFINER bypasses RLS** so trigger works, BUT:
   - If user tries to manually INSERT their preferences, it will fail
   - If future code tries to INSERT (not using service role), it will fail
   - Inconsistent access control

3. **Best practice violation:**
   - Every DML operation should have corresponding policy
   - SELECT + UPDATE without INSERT creates confusion
   - Future developers might waste time debugging policy issues

**Attack scenarios:**
- User cannot manually create their preferences record if trigger fails
- Admin tools cannot bulk-create preferences without service role
- Testing becomes harder (can't insert test data as regular user)

**Recommendations:**
1. **Add INSERT policy** allowing users to insert own preferences
2. **Document SECURITY DEFINER usage** in migration comments
3. **Consider removing SECURITY DEFINER** if INSERT policy exists
4. **Add DELETE policy** for completeness (allow users to reset preferences)

---

### P2 MEDIUM #5: Inconsistent Field Naming

**Severity:** MEDIUM - Developer confusion and maintenance burden
**Impact:** Code is harder to understand, bugs more likely

**Problem:**
Same concept has different names in different places:

**users table:**
- `notification_email`
- `notification_sms`
- `notification_push`

**notification_preferences table:**
- `email_results`
- `sms_results`
- `push_results`

**API endpoint body:**
```typescript
{ email, sms, push }  // Different again!
```

**TypeScript interface:**
```typescript
interface NotificationPreferences {
  email_results: boolean;
  sms_results: boolean;
  push_results: boolean;
}
```

**Why this is a problem:**

1. **Cognitive load:** Developers must remember 3 different naming conventions
2. **Mapping errors:** Easy to confuse `notification_email` vs `email_results`
3. **Inconsistent semantics:**
   - `notification_email` = "Send email notifications?"
   - `email_results` = "Send email when results available?"
   - Are these the same? Different? Unclear!

4. **Future features unclear:**
   - `email_results` implies "only for results"
   - What about pick reminders? Draft notifications? Payment confirmations?
   - Do those use different columns?

**Evidence of confusion:**
Backend reads from TWO tables with different naming, creating fallback complexity.

**Recommendations:**
1. **Standardize on ONE naming convention** (recommendation: `notification_preferences.email_enabled`)
2. **Update all code** to use consistent names
3. **Document field semantics** clearly: "Controls ALL email notifications, not just results"
4. **Consider separate columns** if different notification types need different settings
   - Example: `email_results`, `email_picks`, `email_payments`

---

## Edge Cases and Boundary Conditions Tested

### Test Case 1: Spoiler Delay Boundaries
**Input:** Set spoiler_delay_hours to boundary values
**Expected:** Database constraint enforces 0-72 range
**Actual:** NO UI OR API TO TEST - Feature not implemented
**Status:** FAIL - Cannot test non-existent feature

### Test Case 2: Toggle All Notifications Off
**Input:** Disable email, SMS, and push notifications
**Expected:** User receives NO notifications
**Analysis:**
- Profile.tsx writes to `users` table ✓
- Backend reads from `notification_preferences` first
- If user created after migration 022, preferences table has all = true
- User still receives notifications despite UI showing disabled
**Status:** FAIL - Data inconsistency causes notifications to be sent

### Test Case 3: Enable SMS Without Verified Phone
**Input:** Try to enable SMS notifications without verified phone
**Expected:** Should prevent enabling, show error
**Actual:**
- **Via API endpoint:** Correctly blocks (auth.ts line 250-262) ✓
- **Via Profile.tsx direct write:** NO VALIDATION, allows enabling ✗
**Status:** FAIL - Frontend bypasses validation

### Test Case 4: SMS Notification Sent to Unverified Phone
**Scenario:** User enables SMS via direct write, phone not verified
**Expected:** System should not attempt to send SMS
**Actual Code Analysis:**
```typescript
// spoiler-safe-notifications.ts line 228
if (prefs.sms_results && user.phone) {
  await sendSMS({ to: user.phone, text: '...' });
  // Only checks user.phone exists, NOT phone_verified!
}
```
**Status:** PARTIAL FAIL - Checks phone exists but not phone_verified flag

### Test Case 5: Concurrent Preference Updates
**Scenario:** User updates preferences in two browser tabs simultaneously
**Analysis:**
- Both tabs write directly to Supabase users table
- No optimistic locking
- No transaction isolation
- Last write wins
- Could overwrite each other's changes
**Status:** FAIL - Race condition possible

### Test Case 6: Preferences for New vs Existing Users
**New user flow:**
1. User signs up → Trigger creates notification_preferences record (all true)
2. User disables email in Profile → Updates users.notification_email = false
3. Results job runs → Reads notification_preferences.email_results = true
4. Email sent despite user preference
**Status:** FAIL

**Existing user flow:**
1. User has users.notification_email = false (set before migration)
2. Backfill creates notification_preferences.email_results = true
3. Results job reads notification_preferences table first
4. Email sent, violating user's previous preference
**Status:** FAIL - Migration doesn't preserve existing preferences

### Test Case 7: Default Values Alignment
**Users table defaults:**
```sql
notification_email BOOLEAN DEFAULT TRUE,
notification_sms BOOLEAN DEFAULT FALSE,
notification_push BOOLEAN DEFAULT TRUE
```

**notification_preferences defaults:**
```sql
email_results BOOLEAN DEFAULT true,
sms_results BOOLEAN DEFAULT true,  -- DIFFERENT!
push_results BOOLEAN DEFAULT true
```

**Status:** FAIL - sms_results defaults to true, but notification_sms defaults to false!

### Test Case 8: RLS Policy Enforcement
**Test:** Attempt to view another user's notification preferences
**Expected:** RLS policy blocks access
**Policy:**
```sql
USING (auth.uid() = user_id)
```
**Status:** PASS - Policy correctly restricts access

**Test:** Attempt to update another user's preferences
**Expected:** RLS policy blocks update
**Status:** PASS - Policy correctly restricts updates

**Test:** Attempt to insert preferences for another user
**Expected:** Should block (but no policy exists)
**Status:** UNDEFINED - No INSERT policy to test against

---

## Notification Enforcement Testing

### Code Analysis: sendSpoilerSafeNotification()

**Location:** `server/src/lib/spoiler-safe-notifications.ts` lines 207-243

**Flow:**
1. Get user preferences via `getNotificationPreferences(user.id)`
2. Generate results token
3. If `prefs.email_results === true` → Queue email
4. If `prefs.sms_results === true && user.phone` → Send SMS
5. If `prefs.push_results === true` → Log (not implemented)

**Issues Found:**

1. **Doesn't check phone_verified:**
   ```typescript
   if (prefs.sms_results && user.phone) {
     await sendSMS(...);
     // Missing: && user.phone_verified check!
   }
   ```

2. **Doesn't use spoiler_delay_hours:**
   - Immediately sends notifications
   - Ignores spoiler_delay_hours field completely
   - No scheduling mechanism exists

3. **Dual storage read creates inconsistency:**
   - Reads notification_preferences first
   - Falls back to users table
   - Different users get different data sources

4. **No error handling for preference conflicts:**
   - What if notification_preferences.email_results = true BUT users.notification_email = false?
   - No conflict resolution logic
   - Silently picks one (notification_preferences wins)

**Recommendations:**
1. Add `user.phone_verified` check before SMS
2. Implement spoiler delay scheduling
3. Fix dual storage issue
4. Add conflict detection logging

---

## Admin Dashboard Stats Analysis

**Widget:** NotificationPrefsWidget.tsx
**API Endpoint:** GET /api/admin/notification-preferences/stats

**Problem:** Stats read from WRONG TABLE!

```typescript
// admin.ts lines 1095-1105
const { data: allPrefs } = await supabaseAdmin
  .from('users')  // READS FROM USERS TABLE!
  .select('notification_email, notification_sms, notification_push');

const emailEnabled = allPrefs?.filter((p) => p.notification_email).length || 0;
// Shows stats from users table, NOT notification_preferences table
```

**Impact:**
- Admin sees stats from legacy storage
- Actual notification behavior uses notification_preferences table
- Dashboard shows incorrect data
- Admin cannot diagnose preference issues

**Test Scenario:**
1. All users have `users.notification_email = false`
2. All users have `notification_preferences.email_results = true`
3. Admin dashboard shows: "0 users have email enabled"
4. Results job sends emails to ALL users
5. Admin confused why emails sent when dashboard shows 0

**Status:** FAIL - Admin dashboard misleading

---

## Data Flow Diagram (Current Broken State)

```
USER ACTION (Profile Page)
      |
      v
Profile.tsx: updateNotifications()
      |
      v
Supabase Client: users.update()
      |
      v
PostgreSQL: users table
      |
      +---> notification_email
      +---> notification_sms
      +---> notification_push

NOTIFICATION SEND (Results Release)
      |
      v
sendSpoilerSafeNotification()
      |
      v
getNotificationPreferences()
      |
      +---> Try notification_preferences table FIRST
      |           |
      |           +---> email_results
      |           +---> sms_results
      |           +---> push_results
      |
      +---> Fallback to users table if above fails
                  |
                  +---> notification_email
                  +---> notification_sms
                  +---> notification_push

RESULT: User updates one table, system reads from other table!
```

---

## Recommendations Summary

### Immediate (P0 - Before Launch)

1. **Fix Dual Storage System**
   - Migrate all preference writes to notification_preferences table
   - Update Profile.tsx to use notification_preferences
   - Update Notifications.tsx to use notification_preferences
   - Copy current users.notification_* to notification_preferences
   - Deprecate users.notification_* columns

2. **Implement Spoiler Delay Feature**
   - Add UI controls (dropdown: 0h, 6h, 12h, 24h, 48h, 72h)
   - Extend API validation schema
   - Update PATCH /api/me/notifications endpoint
   - Implement scheduling in sendSpoilerSafeNotification()
   - Modify releaseResults job to handle delays

3. **Fix Frontend API Bypass**
   - Refactor Profile.tsx to call PATCH /api/me/notifications
   - Remove direct Supabase writes
   - Test phone verification enforcement

### High Priority (P1)

4. **Add Missing RLS Policies**
   - Add INSERT policy on notification_preferences
   - Add DELETE policy for preference reset
   - Document SECURITY DEFINER usage

5. **Fix Admin Dashboard**
   - Update stats query to read from notification_preferences
   - Add data source indicator
   - Show both tables during migration period

6. **Add phone_verified Check**
   - Update sendSpoilerSafeNotification() to check phone_verified
   - Add error logging for unverified phones

### Medium Priority (P2)

7. **Standardize Naming**
   - Pick one naming convention
   - Update all code consistently
   - Document field semantics

8. **Add Integration Tests**
   - Test preference updates end-to-end
   - Test notification enforcement
   - Test edge cases (concurrent updates, defaults, etc.)

9. **Add Preference Audit Log**
   - Track all preference changes
   - Include timestamp, old value, new value
   - Help debug user complaints

---

## Test Artifacts

### Code Files Analyzed
- `/server/src/lib/spoiler-safe-notifications.ts` - Notification sending logic
- `/server/src/routes/auth.ts` - API endpoints (PATCH /api/me/notifications)
- `/server/src/routes/admin.ts` - Admin stats endpoint
- `/web/src/pages/Profile.tsx` - User profile page (direct DB writes)
- `/web/src/pages/Notifications.tsx` - Notification preferences UI
- `/web/src/components/admin/NotificationPrefsWidget.tsx` - Admin dashboard widget
- `/supabase/migrations/001_initial_schema.sql` - Users table schema
- `/supabase/migrations/022_notification_preferences.sql` - Preferences table schema

### Database Schema Analyzed
- `users` table: notification_email, notification_sms, notification_push
- `notification_preferences` table: email_results, sms_results, push_results, spoiler_delay_hours
- RLS policies on notification_preferences (SELECT, UPDATE only)
- Trigger: create_notification_preferences_for_new_user()

### API Endpoints Tested (Code Analysis)
- GET /api/me - Fetches user profile ✓
- PATCH /api/me/notifications - Updates preferences (not used by frontend!)
- GET /api/admin/notification-preferences/stats - Shows wrong data

---

## Risk Assessment

### Launch Blockers (Cannot Launch Without Fixing)
1. **Dual storage system** - Users' preferences will be ignored
2. **Missing spoiler delay** - Advertised feature doesn't work
3. **Frontend bypass** - Validation can be circumvented

### High Risk (Should Fix Before Launch)
4. **No phone_verified check** - SMS sent to invalid numbers (cost + deliverability)
5. **Missing RLS policies** - Security gap
6. **Admin dashboard incorrect** - Cannot diagnose issues

### Medium Risk (Fix Soon After Launch)
7. **Inconsistent naming** - Developer confusion, harder maintenance
8. **No audit log** - Cannot debug user issues
9. **No integration tests** - Regression risk on future changes

---

## Conclusion

The notification preferences system has **severe architectural issues** that create data inconsistency between two storage locations. The frontend writes to one table (`users`) while the backend reads from another (`notification_preferences`), causing user preferences to be ignored.

Additionally, the spoiler delay feature - a core selling point of the spoiler-safe system - is completely unimplemented despite having database schema, migration, and documentation.

**Status:** NOT READY FOR PRODUCTION

**Recommended Action:**
1. Halt launch until dual storage system is fixed
2. Either implement spoiler delay OR remove from documentation
3. Fix frontend to use API endpoints instead of direct database writes

**Estimated Fix Time:**
- Dual storage fix: 4-6 hours
- Spoiler delay implementation: 6-8 hours
- Frontend API refactor: 2-3 hours
- Testing: 3-4 hours
**Total: 15-21 hours**

---

## Appendix: Test Charters Used

### Charter 1: Happy Path Testing
**Goal:** Verify basic preference update flows work
**Time:** 15 minutes
**Result:** Found dual storage issue immediately

### Charter 2: Edge Case Discovery
**Goal:** Test boundary conditions and unusual inputs
**Time:** 20 minutes
**Result:** Found spoiler delay missing, default value misalignment

### Charter 3: Security Testing
**Goal:** Verify RLS policies and API validation
**Time:** 15 minutes
**Result:** Found frontend bypass, missing INSERT policy

### Charter 4: Notification Enforcement
**Goal:** Verify preferences are respected when sending
**Time:** 10 minutes
**Result:** Found phone_verified not checked, spoiler_delay not used

---

**Report Generated:** December 27, 2025
**Next Steps:** Share findings with development team, prioritize fixes, re-test after implementation
