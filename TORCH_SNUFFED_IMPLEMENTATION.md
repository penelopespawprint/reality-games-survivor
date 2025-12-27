# Auto-Pick Silent Failure Fix: "Torch Snuffed" Notification

## Problem Statement
**P1 BUG**: Users with zero active castaways get no notification when auto-pick is impossible. Silent failure creates bad UX where users are unaware they're out of the game.

## Solution Implemented

### 1. Email Template Created
**File**: `/server/src/emails/transactional/torch-snuffed.ts`

Creates a dramatic, Survivor-themed email notification:
- Fire emoji and "Your Torch Has Been Snuffed" headline
- Clear explanation: "Both your castaways have been eliminated"
- States they can no longer compete in the league
- Lists what they CAN still do (watch standings, chat, join other leagues)
- Encourages continued engagement with "Keep Watching!"

### 2. Email Service Method Added
**File**: `/server/src/emails/service.ts`

Added `EmailService.sendTorchSnuffed()` method:
- Uses `sendEmailCritical()` for reliable delivery with retry logic
- Subject: "🔥 Your torch has been snuffed in [League Name]"
- Includes all necessary data: display name, email, league name/ID, episode number

### 3. Auto-Pick Job Enhanced
**File**: `/server/src/jobs/autoPick.ts`

Enhanced the auto-pick job to detect and notify eliminated users:

**Detection Logic**:
```typescript
if (!activeCastaways || activeCastaways.length === 0) {
  // User has NO active castaways - their torch is snuffed!
}
```

**Notifications Sent**:
1. **Email** (if user has email notifications enabled)
   - Sends torch snuffed email template
   - Logs success/failure with clear console messages

2. **SMS** (if user has SMS enabled AND phone number set)
   - Message: "[RGFL] Both your castaways have been eliminated in [League]. Your torch has been snuffed and you can no longer compete this season. Check your email for details."
   - Logs success/failure

**Database Update**:
- Marks user as eliminated in `league_members.is_eliminated = true`
- Provides clear audit trail

**Enhanced Logging**:
```
[AutoPick] User {id} has zero active castaways in league {id}
[AutoPick] Sent torch snuffed email to {email}
[AutoPick] Sent torch snuffed SMS to {phone}
[AutoPick] Marked user {id} as eliminated in league {id}
[AutoPick] Notified {count} eliminated users (torch snuffed)
```

### 4. Database Migration
**Migration**: `add_is_eliminated_to_league_members`

Added new column to `league_members` table:
```sql
ALTER TABLE league_members
ADD COLUMN is_eliminated boolean DEFAULT false;

COMMENT ON COLUMN league_members.is_eliminated IS
  'True when user has zero active castaways remaining (torch snuffed)';
```

## Success Criteria ✅

✅ Email sent when auto-pick impossible
✅ User marked as eliminated in database
✅ Clear messaging about torch being snuffed
✅ SMS notification for users with SMS enabled
✅ Enhanced logging for admin visibility
✅ Graceful error handling (catches and logs failures)

## Technical Details

### Files Modified
1. `/server/src/emails/transactional/torch-snuffed.ts` - New email template
2. `/server/src/emails/service.ts` - Added TorchSnuffedEmailData interface and sendTorchSnuffed() method
3. `/server/src/jobs/autoPick.ts` - Enhanced with elimination detection and notification logic
4. Database: Added `is_eliminated` column to `league_members`

### Return Value Enhancement
The `autoPick()` function now returns:
```typescript
{
  autoPicked: number,    // Count of users who received auto-pick
  users: string[],       // User IDs who received auto-pick
  eliminated: number     // Count of users notified about elimination
}
```

### User Experience Flow
1. **Before Pick Deadline**: User has 2 castaways, both get eliminated
2. **Pick Deadline Passes**: User misses making a pick
3. **Auto-Pick Job Runs** (Wed 3:05pm PST):
   - Detects user has 0 active castaways
   - Sends "Torch Snuffed" email (dramatic, Survivor-themed)
   - Sends SMS alert (if enabled)
   - Marks user as `is_eliminated = true` in database
   - Logs all actions for admin visibility
4. **User Receives Notifications**: Clear understanding of their status
5. **User Can Still**: View standings, participate in chat, enjoy the season

### Error Handling
All notification attempts are wrapped in try/catch:
- Email failures are logged but don't crash the job
- SMS failures are logged but don't crash the job
- Database update is separate from notifications (resilient)
- Job continues processing other users even if one fails

## Testing Verification
✅ TypeScript compilation passes (`npm run build`)
✅ Logic tested with unit test scenarios
✅ Database migration applied successfully
✅ Email service method properly typed
✅ Return value matches expected interface

## Future Enhancements (Optional)
- Add push notifications when mobile app exists
- Show eliminated status badge on league standings
- Allow eliminated users to view "what if" scenarios
- Track elimination stats (who lasted longest)

## Deployment Notes
- No breaking changes
- Database migration is additive only (adds column, no data changes)
- Existing auto-pick behavior unchanged (only adds notification)
- Safe to deploy immediately

---

**Implementation Date**: 2025-12-27
**Developer**: Claude + Richard
**Status**: ✅ Complete and Ready for Deployment
