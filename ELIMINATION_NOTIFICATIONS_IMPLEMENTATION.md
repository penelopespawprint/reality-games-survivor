# Elimination Notifications Implementation

## Problem Statement
**P1 BUG**: Users with zero active castaways get no notification when auto-pick is impossible. Silent failure creates bad UX where users are unaware they're out of the game.

## Root Cause Understanding
The issue occurs when:
1. Admin marks a castaway as "eliminated" in the scoring interface
2. A user's last (or both) active castaways are eliminated
3. User receives NO notification about this critical status change

## Solution: Proactive Elimination Notifications

### Architecture Decision
**Trigger Point**: Notifications are sent immediately when admin marks a castaway as eliminated (NOT during auto-pick).

**Why This Approach?**
- ✅ Immediate notification when elimination happens
- ✅ User learns about it right after the episode is scored
- ✅ No delay until next pick deadline
- ✅ Clear attribution (specific castaway was eliminated)

---

## Implementation Details

### 1. Email Template: "Torch Snuffed"
**File**: `/server/src/emails/transactional/torch-snuffed.ts`

Dramatic, Survivor-themed email sent when BOTH castaways are eliminated:

```typescript
🔥 Your Torch Has Been Snuffed

Both your castaways have been eliminated.
You can no longer compete in [League Name].

What you CAN still do:
✓ Watch the leaderboard and standings
✓ Participate in league chat
✓ Join other leagues (if spots available)

📺 Keep Watching!
```

**Email Service Method**: `EmailService.sendTorchSnuffed()`
- Uses `sendEmailCritical()` for reliable delivery with retry logic
- Subject: "🔥 Your torch has been snuffed in [League Name]"

### 2. Existing Email Template: "Elimination Alert"
**Used for single castaway elimination** (already exists in codebase)

Sent when ONE castaway is eliminated (user still has one remaining):

```typescript
😢 [Castaway Name] Has Been Eliminated

The tribe has spoken.
You still have one castaway remaining.
Choose wisely each week!
```

---

## Admin Endpoint Enhancement

### `/api/admin/castaways/:id/eliminate` (POST)
**File**: `/server/src/routes/admin.ts`

Enhanced to send notifications immediately upon elimination:

#### Flow Diagram

```
Admin marks castaway      Find all users with          Check each user's
as eliminated         →   this castaway on roster  →   remaining active castaways
                                                        │
                           ┌────────────────────────────┴────────────────────────────┐
                           │                                                         │
                           ▼                                                         ▼
                    0 Active Castaways                                     1 Active Castaway
                    (TORCH SNUFFED 🔥)                                    (Still in the game)
                           │                                                         │
                           ├─ Send "Torch Snuffed" email ✉️                        ├─ Send "Elimination Alert" email ✉️
                           ├─ Send "Torch Snuffed" SMS 📱                          ├─ Send "Elimination" SMS 📱
                           ├─ Mark as eliminated in DB ✓                           └─ Continue (user still active)
                           └─ Log for admin visibility 📝
```

#### Notification Logic

**When a castaway is marked as eliminated:**

1. **Find Affected Users**
   - Query all rosters with this castaway
   - Only active roster spots (not dropped)
   - Get user notification preferences

2. **For Each Affected User:**
   - Count remaining active castaways
   - Send appropriate notifications

3. **If 0 Active Castaways (TORCH SNUFFED):**
   - **Email**: "Your Torch Has Been Snuffed" 🔥
   - **SMS**: "Both your castaways have been eliminated in [League]. Your torch has been snuffed..."
   - **Database**: Mark `league_members.is_eliminated = true`
   - **Log**: `[Elimination] User {id} has ZERO active castaways - TORCH SNUFFED`

4. **If 1 Active Castaway Remaining:**
   - **Email**: "Elimination Alert" (existing template)
   - **SMS**: "{Castaway} has been eliminated. You have 1 castaway remaining in [League]. Choose wisely!"
   - **Log**: `[Elimination] User {id} has 1 active castaway remaining`

---

## Database Changes

### Migration: `add_is_eliminated_to_league_members`

```sql
ALTER TABLE league_members
ADD COLUMN is_eliminated boolean DEFAULT false;

COMMENT ON COLUMN league_members.is_eliminated IS
  'True when user has zero active castaways remaining (torch snuffed)';
```

**Purpose**:
- Clear audit trail of eliminated users
- Can be used for UI badges/filters
- Prevents auto-pick attempts for eliminated users

---

## Files Modified

| File | Change |
|------|--------|
| `/server/src/emails/transactional/torch-snuffed.ts` | **NEW** - Torch snuffed email template |
| `/server/src/emails/service.ts` | Added `TorchSnuffedEmailData` interface and `sendTorchSnuffed()` method |
| `/server/src/routes/admin.ts` | Enhanced `/api/admin/castaways/:id/eliminate` with notification logic |
| `/server/src/jobs/autoPick.ts` | Added comment explaining elimination notifications happen at elimination time |
| Database | Added `is_eliminated` column to `league_members` table |

---

## Error Handling & Resilience

### Graceful Degradation
- Email failures are logged but don't crash the endpoint
- SMS failures are logged but don't crash the endpoint
- Each user processed independently (one failure doesn't affect others)
- Castaway is marked as eliminated BEFORE notifications (atomic operation)

### Logging Strategy

```
[Elimination] {Castaway Name} eliminated, notifying {count} users
[Elimination] User {id} has ZERO active castaways in league {id} - TORCH SNUFFED
[Elimination] Sent torch snuffed email to {email}
[Elimination] Sent torch snuffed SMS to {phone}
[Elimination] Failed to send torch snuffed email to {email}: {error}
[Elimination] User {id} has 1 active castaway remaining in league {id}
[Elimination] Sent elimination alert email to {email}
```

**Admin Visibility**: All actions logged with `[Elimination]` prefix for easy monitoring.

---

## User Experience Flow

### Scenario 1: First Castaway Eliminated

**Episode 5 scores, Boston Rob gets voted out**

1. **Admin Action**: Marks Boston Rob as eliminated
2. **Backend**: Finds all users with Boston Rob
3. **For User with 1 Active Remaining**:
   - 📧 Email: "Boston Rob has been eliminated"
   - 📱 SMS: "Boston Rob eliminated. You have 1 castaway remaining. Choose wisely!"
4. **User Experience**:
   - ✅ Knows exactly what happened
   - ✅ Aware they still have one castaway
   - ✅ Can continue playing

### Scenario 2: Second Castaway Eliminated

**Episode 7 scores, Parvati gets voted out (user's last castaway)**

1. **Admin Action**: Marks Parvati as eliminated
2. **Backend**: Finds all users with Parvati
3. **For User with 0 Active Remaining**:
   - 📧 Email: "Your Torch Has Been Snuffed" 🔥
   - 📱 SMS: "Both castaways eliminated. Torch snuffed."
   - 💾 Database: `is_eliminated = true`
4. **User Experience**:
   - ✅ Dramatic Survivor-themed notification
   - ✅ Understands they're out of competition
   - ✅ Can still watch standings, chat, join other leagues
   - ✅ No confusion about why they can't make picks

### Scenario 3: Auto-Pick Deadline (Wed 3:05pm)

**User has been eliminated previously**

1. **Auto-Pick Job Runs**: Skips users with 0 active castaways
2. **Log**: "No active castaways to pick (notifications already sent)"
3. **No Additional Emails**: User already knows their status

---

## Success Criteria

✅ **Immediate Notification**: Users notified when castaway eliminated (not delayed until next deadline)
✅ **Two-Tier System**: Different messages for "1 remaining" vs "torch snuffed"
✅ **Multi-Channel**: Email + SMS (if user opted in)
✅ **Database Tracking**: `is_eliminated` flag for audit trail
✅ **Enhanced Logging**: Admin can monitor all elimination notifications
✅ **Graceful Errors**: Email failures don't crash elimination endpoint
✅ **Build Passing**: TypeScript compiles successfully
✅ **No Breaking Changes**: Existing functionality unchanged

---

## Testing Scenarios

### Manual Test Plan

1. **Test Single Elimination**:
   - User has 2 active castaways
   - Admin marks one as eliminated
   - Verify user receives "Elimination Alert" email/SMS
   - Verify user still has `is_eliminated = false`

2. **Test Torch Snuffed**:
   - User has 1 active castaway
   - Admin marks it as eliminated
   - Verify user receives "Torch Snuffed" email/SMS 🔥
   - Verify user marked as `is_eliminated = true`

3. **Test Multiple Users**:
   - Multiple users have same castaway
   - Admin marks castaway as eliminated
   - Verify ALL users receive appropriate notifications

4. **Test Notification Preferences**:
   - User has email disabled
   - Verify no email sent
   - User has SMS disabled
   - Verify no SMS sent

5. **Test Error Resilience**:
   - Force email failure (invalid email)
   - Verify castaway still marked as eliminated
   - Verify other users still notified

---

## Deployment Checklist

- [x] TypeScript compilation successful
- [x] Database migration applied (add `is_eliminated` column)
- [x] Email template created and integrated
- [x] Admin endpoint enhanced with notification logic
- [x] Auto-pick job updated (removed redundant logic)
- [x] Error handling implemented
- [x] Logging added for admin visibility
- [ ] Deploy to Railway
- [ ] Monitor logs during next scoring session
- [ ] Verify emails/SMS sent when castaway eliminated

---

## Future Enhancements

- [ ] Push notifications (when mobile app exists)
- [ ] Show "ELIMINATED" badge on league standings
- [ ] Allow eliminated users to view "what if" scenarios
- [ ] Track elimination stats (who lasted longest, elimination leaderboard)
- [ ] Add "torch snuffed" animation in UI

---

**Implementation Date**: 2025-12-27
**Developer**: Claude + Richard
**Status**: ✅ Complete and Ready for Deployment
**Risk Level**: 🟢 LOW (Additive changes only, no breaking changes)
