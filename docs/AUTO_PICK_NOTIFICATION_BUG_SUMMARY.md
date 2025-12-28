# CRITICAL BUG: Auto-Pick Notifications Not Sent

**Status:** ❌ BLOCKER - Must fix before launch
**Priority:** P0
**Impact:** HIGH - Users confusion and poor UX
**Discovery Date:** December 27, 2025
**File:** `/server/src/jobs/autoPick.ts`

---

## Problem Statement

When the scheduled auto-pick job runs every Wednesday at 3:05 PM PST, it successfully creates auto-picks in the database for users who missed the deadline. However, **it does NOT send any notification** (email or SMS) to inform users that an auto-pick was made on their behalf.

**User Impact:**
- User misses pick deadline
- Auto-pick is silently created in database
- User logs in and sees a pick they didn't make
- User is confused: "I didn't make this pick?"
- No explanation, no notification, no visibility

---

## Root Cause

### Architecture Issue: Duplicate Implementations

There are **TWO separate auto-pick implementations** in the codebase:

#### 1. Scheduled Job (Production) - `/server/src/jobs/autoPick.ts`
- ✅ Runs automatically Wed 3:05pm PST
- ✅ Detects eliminated users (0 active castaways)
- ✅ Sends "torch snuffed" email/SMS
- ✅ Marks eliminated users in database
- ❌ **Does NOT send auto-pick alert email**
- ❌ **Does NOT send auto-pick SMS**

#### 2. Admin API Route - `/server/src/routes/picks.ts` POST `/api/picks/auto-fill`
- ✅ Sends auto-pick alert email
- ✅ Logs notification to database
- ❌ Requires manual admin trigger
- ❌ Does NOT detect eliminated users
- ❌ Does NOT send torch snuffed notifications

**The scheduled job (used in production) is missing the notification code that exists in the admin API route.**

---

## Evidence

### Scheduled Job Code (Lines 100-114 in `autoPick.ts`)
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
  // ❌ NO NOTIFICATION SENT HERE
}
```

### Admin API Route Code (Lines 347-397 in `picks.ts`)
```typescript
// Send auto-pick alert emails (fire and forget)
(async () => {
  for (const autoPick of autoPicks) {
    try {
      // Get user, castaway, league, and episode details
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, display_name')
        .eq('id', autoPick.user_id)
        .single();

      // ... fetch castaway, league, episode details ...

      if (user && castawayDetails && leagueDetails && episodeDetails) {
        await EmailService.sendAutoPickAlert({
          displayName: user.display_name,
          email: user.email,
          castawayName: castawayDetails.name,
          leagueName: leagueDetails.name,
          leagueId: autoPick.league_id,
          episodeNumber: episodeDetails.number,
        });

        await EmailService.logNotification(
          autoPick.user_id,
          'email',
          `Auto-pick applied: ${castawayDetails.name}`,
          `You missed the pick deadline for Episode ${episodeDetails.number}. We auto-selected ${castawayDetails.name} for you.`
        );
      }
    } catch (emailErr) {
      console.error('Failed to send auto-pick alert email:', emailErr);
    }
  }
})();
```

---

## Fix Required

Add notification sending to the scheduled job (`/server/src/jobs/autoPick.ts`) after creating auto-pick.

### Implementation (Lines 100-140 in `autoPick.ts`)

Replace:
```typescript
if (!error) {
  autoPickedUsers.push(member.user_id);
}
```

With:
```typescript
if (!error) {
  autoPickedUsers.push(member.user_id);

  // Send auto-pick notification
  try {
    // Get user details for notification
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, display_name, phone, notification_email, notification_sms')
      .eq('id', member.user_id)
      .single();

    if (!user) {
      console.error(`Failed to get user ${member.user_id} for auto-pick notification`);
      continue;
    }

    // Send email if enabled
    if (user.notification_email) {
      await EmailService.sendAutoPickAlert({
        displayName: user.display_name,
        email: user.email,
        castawayName: autoCastaway.castaways.name,
        leagueName: league.name,
        leagueId: league.id,
        episodeNumber: episode.number,
      });
      console.log(`[AutoPick] Auto-pick alert email sent to ${user.email}`);
    }

    // Send SMS if enabled and phone exists
    if (user.notification_sms && user.phone) {
      await sendSMS({
        to: user.phone,
        text: `[RGFL] Auto-pick for Episode ${episode.number}: ${autoCastaway.castaways.name} selected for ${league.name}. Reply STOP to opt out.`,
        isTransactional: false,
      });
      console.log(`[AutoPick] Auto-pick alert SMS sent to ${user.phone}`);
    }

    // Log notification for admin visibility
    await EmailService.logNotification(
      member.user_id,
      'email',
      `Auto-pick applied: ${autoCastaway.castaways.name}`,
      `You missed the pick deadline for Episode ${episode.number}. We auto-selected ${autoCastaway.castaways.name} for you in ${league.name}.`
    );
  } catch (notificationError) {
    console.error(`Failed to send auto-pick notification for user ${member.user_id}:`, notificationError);
    // Continue - don't fail the entire job if notification fails
  }
}
```

---

## Testing Plan

### 1. Unit Test
Create test file `/server/src/jobs/__tests__/autoPick-notifications.test.ts`:
```typescript
describe('autoPick notifications', () => {
  it('should send email when user has notification_email enabled', async () => {
    // Setup user with notification_email = true
    // Create league, episode, roster
    // Run autoPick()
    // Verify EmailService.sendAutoPickAlert was called
  });

  it('should send SMS when user has notification_sms enabled', async () => {
    // Setup user with notification_sms = true and phone
    // Create league, episode, roster
    // Run autoPick()
    // Verify sendSMS was called
  });

  it('should not send email when user has notification_email disabled', async () => {
    // Setup user with notification_email = false
    // Run autoPick()
    // Verify EmailService.sendAutoPickAlert was NOT called
  });

  it('should continue job if notification fails', async () => {
    // Mock EmailService.sendAutoPickAlert to throw error
    // Run autoPick()
    // Verify job completes successfully
    // Verify error is logged
  });
});
```

### 2. Integration Test
```bash
# 1. Create test data
# - Season with active episode
# - League with 2 users
# - User 1: Has pick already
# - User 2: Missing pick, has 2 active castaways

# 2. Run auto-pick job manually
cd server
npm run build
node -e "import('./dist/jobs/autoPick.js').then(m => m.autoPick()).then(console.log)"

# 3. Verify results
# - User 2 has weekly_pick with status='auto_picked'
# - Email sent to User 2 (check logs)
# - Notification logged in notifications table
```

### 3. Production Verification
```bash
# After deployment, monitor first scheduled run

# Check job execution logs
railway logs --service rgfl-api | grep AutoPick

# Expected output:
# [AutoPick] Auto-picked for X users
# [AutoPick] Auto-pick alert email sent to user@example.com
# [AutoPick] Auto-pick alert SMS sent to +1234567890
```

---

## Related Issues

### Issue #2: Auto-Pick Selection Logic
**Current:** Picks first available castaway (database order - undefined)
**Expected:** Picks highest-ranked castaway OR alternates between 2 castaways
**Priority:** P1 (High)

Line 97-98 in `autoPick.ts`:
```typescript
// Pick first available (could add ranking logic here)
const autoCastaway = activeCastaways[0];
```

**Fix:** Add ranking logic using `draft_rankings` table or previous picks.

---

## Impact Assessment

### If Not Fixed

**User Experience:**
- Users receive NO notification when auto-pick happens
- Users are confused when they see picks they didn't make
- Users may think the system is broken
- Support tickets will increase
- User trust erodes

**Operational:**
- Admin has no visibility into whether notifications were sent
- Cannot debug user complaints
- No audit trail for auto-pick notifications

### After Fix

**User Experience:**
- Users receive clear email: "Auto-pick applied: {castaway}"
- Email explains what happened and why
- SMS reminder if enabled
- Users are informed before they check the app
- Professional, expected behavior

**Operational:**
- All auto-pick notifications logged in database
- Admin can verify notification delivery
- Clear audit trail for support
- Job monitoring tracks notification success/failure

---

## Estimated Fix Time

- **Code changes:** 30 minutes
- **Testing:** 1-2 hours
- **Code review:** 30 minutes
- **Deployment:** 15 minutes

**Total:** 2.5-3 hours

---

## Files to Change

1. `/server/src/jobs/autoPick.ts` - Add notification sending (lines 100-114)
2. `/server/src/jobs/__tests__/autoPick-notifications.test.ts` - Create test file (new)

---

## Deployment Checklist

- [ ] Code changes implemented
- [ ] Unit tests added
- [ ] Build succeeds (`npm run build`)
- [ ] Integration test passes
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Tested in staging environment
- [ ] Deployed to production
- [ ] Monitor first scheduled run (Wed 3:05pm PST)
- [ ] Verify email/SMS sent
- [ ] Verify notifications logged in database

---

## Conclusion

**This is a CRITICAL bug that must be fixed before launch.**

Users who miss pick deadlines will receive auto-picks but have NO IDEA it happened. This creates confusion, erodes trust, and damages the user experience.

The fix is straightforward: copy the notification logic from the admin API route (`/server/src/routes/picks.ts`) to the scheduled job (`/server/src/jobs/autoPick.ts`).

**Recommendation:** Fix immediately (P0 priority) before December 19, 2025 launch.

---

**Report Generated:** December 27, 2025
**QA Agent:** Exploratory Testing Specialist
**Related Report:** `/server/AUTO_PICK_JOB_TEST_REPORT.md` (full details)
