# QA Test Report: SMS STATUS Command

**Test Date:** December 27, 2025
**Tester:** Claude (Exploratory Testing Agent)
**Component:** SMS STATUS Command
**Location:** `/server/src/routes/webhooks.ts` (lines 467-488)
**Status:** CRITICAL ISSUES FOUND

---

## Executive Summary

The SMS STATUS command has been analyzed and **FAILS 3 out of 4 verification requirements**. The implementation only shows recent picks but does NOT provide the critical information users expect:

1. ❌ Does NOT show whether current week's pick is submitted or missed
2. ❌ Does NOT show current points total
3. ✅ Shows recent picks (last 5)
4. ✅ Logs commands to sms_commands table

**Risk Level:** HIGH - Users cannot use SMS to check their game status effectively.

---

## Test Charter

**Mission:** Verify the SMS STATUS command provides users with actionable information about their current game state via text message.

**Time Box:** 90 minutes

**Focus Areas:**
- Current week pick status (submitted vs. missed)
- Points total display
- Recent picks history
- Command logging
- Error handling for edge cases

---

## Implementation Analysis

### Current Implementation (lines 467-488)

```typescript
case 'STATUS': {
  if (!user) {
    response = 'Phone not registered. Visit rgfl.app to link your phone.';
    break;
  }

  // Get current picks
  const { data: picks } = await supabaseAdmin
    .from('weekly_picks')
    .select('castaways(name), leagues(name)')
    .eq('user_id', user.id)
    .order('picked_at', { ascending: false })
    .limit(5);

  if (!picks || picks.length === 0) {
    response = 'No recent picks found.';
  } else {
    response = 'Recent picks:\n' + picks.map((p: any) =>
      `${p.castaways?.name} - ${p.leagues?.name}`
    ).join('\n');
  }
  break;
}
```

### What It DOES:
1. Validates user phone is registered
2. Queries last 5 weekly picks (all-time, not filtered to current week)
3. Returns castaway name + league name for each pick
4. Orders by `picked_at` descending (most recent first)

### What It DOES NOT DO:
1. Check if current week's pick is submitted
2. Show points total from `league_members.total_points`
3. Indicate pick status (pending/locked/auto_picked)
4. Show which episode/week the picks are for
5. Indicate if picks lock time has passed

---

## Critical Defects Found

### DEFECT 1: No Current Week Pick Status (P0 - CRITICAL)

**Expected Behavior:**
When user texts "STATUS", they should see if they've submitted their pick for the current week (before Wednesday 3pm deadline).

**Actual Behavior:**
Shows last 5 picks from any week, no indication of current week status.

**Example Current Output:**
```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - Global League
```

**Expected Output:**
```
Week 5 Status:
✓ Pick submitted: Tony Vlachos (My League)
⚠ No pick yet (Global League)
Picks lock: Wed 3:00 PM PST

Your total points: 245
```

**Impact:**
Users cannot determine if they need to submit a pick before the deadline. This defeats the primary use case for SMS commands - quick status checks while away from computer.

**Root Cause:**
Query selects from `weekly_picks` without filtering to current episode. No logic to check current episode's deadline or compare against picks submitted.

**Technical Fix Required:**
1. Query `episodes` table for current/next episode (WHERE `picks_lock_at > NOW()`)
2. Check if user has submitted pick for that episode in each league
3. Show deadline time and submission status per league
4. Query `league_members.total_points` for each league

---

### DEFECT 2: No Points Total Display (P0 - CRITICAL)

**Expected Behavior:**
User should see their current point total when checking status.

**Actual Behavior:**
Points are never queried or displayed.

**Impact:**
Users checking status via SMS get no feedback on their game performance. Points are the primary metric for competition.

**Root Cause:**
Query selects only `castaways(name), leagues(name)` from weekly_picks. Does not join to `league_members` to get `total_points`.

**Technical Fix Required:**
```typescript
// Get user's leagues with points
const { data: leagues } = await supabaseAdmin
  .from('league_members')
  .select('league_id, total_points, rank, leagues(name)')
  .eq('user_id', user.id);
```

---

### DEFECT 3: Misleading Response for Multi-League Users (P1 - HIGH)

**Expected Behavior:**
If user is in multiple leagues, status should show per-league breakdown.

**Actual Behavior:**
Shows picks without context of which league user cares about. If user picked different castaways in different leagues for the same week, response is confusing.

**Example Scenario:**
User is in 2 leagues:
- "Work League" - picked Tony for Week 5
- "Friends League" - picked Sarah for Week 5

Current output shows both but doesn't indicate these are for the same week.

**Impact:**
Confusion about game state, especially during active weeks.

---

### DEFECT 4: No Episode/Week Context (P1 - HIGH)

**Expected Behavior:**
Picks should show which episode/week they're for.

**Actual Behavior:**
Just shows castaway name and league, no episode number.

**Example Current Output:**
```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - My League
Parvati Shallow - My League
```

User cannot tell which episodes these picks were for. Are they all recent? All from Week 1?

**Impact:**
Historical picks are meaningless without episode context.

**Technical Fix Required:**
```typescript
.select('castaways(name), leagues(name), episodes(number)')
```

Then format as:
```
Recent picks:
Week 5: Tony Vlachos (My League)
Week 4: Sarah Lacina (My League)
Week 3: Parvati Shallow (My League)
```

---

### DEFECT 5: Pick Status Not Shown (P2 - MEDIUM)

**Expected Behavior:**
If pick was auto-picked due to missed deadline, user should know.

**Actual Behavior:**
All picks look the same regardless of status.

**Database Schema:**
`weekly_picks.status` is enum: 'pending', 'locked', 'auto_picked'

**Current Query:**
Does not select `status` column.

**Impact:**
Users don't know if they missed deadlines or if system auto-picked for them.

**Technical Fix Required:**
```typescript
.select('castaways(name), leagues(name), episodes(number), status')
```

Format as:
```
Recent picks:
Week 5: Tony Vlachos (My League) ✓
Week 4: Sarah Lacina (My League) [AUTO]
```

---

## Edge Case Analysis

### Edge Case 1: User in Zero Leagues
**Setup:** User registered, verified phone, but hasn't joined any leagues yet.

**Expected:** "You haven't joined any leagues yet. Visit rgfl.app to join or create a league."

**Actual:** Query returns 0 picks, shows "No recent picks found."

**Verdict:** Misleading but not broken. Could be more helpful.

---

### Edge Case 2: User Joined Leagues But Draft Hasn't Happened
**Setup:** User in league, but season premiere hasn't aired yet (no episodes to pick for).

**Expected:** "Season 50 premieres Feb 25, 2026. Draft opens after Episode 1."

**Actual:** "No recent picks found." (technically correct but not informative)

**Verdict:** Confusing for new users.

---

### Edge Case 3: User Has Eliminated Roster (Both Castaways Eliminated)
**Setup:** Both of user's castaways have been eliminated.

**Expected:** "Your torch has been snuffed! Both castaways eliminated. Final rank: 8th place (245 points)"

**Actual:** "No recent picks found." (if no picks submitted) or shows last pick before elimination.

**Verdict:** No indication of elimination status.

---

### Edge Case 4: Picks Lock in 30 Minutes
**Setup:** Current time is 2:30 PM PST Wednesday, picks lock at 3:00 PM.

**Expected:** "⚠ URGENT: Picks lock in 30 minutes! Submit now at rgfl.app"

**Actual:** No urgency indication.

**Verdict:** Missed opportunity for critical user notification.

---

### Edge Case 5: Multiple Leagues, Mixed Pick Status
**Setup:** User in 3 leagues:
- League A: Pick submitted
- League B: No pick yet
- League C: Castaway eliminated, cannot pick

**Expected:** Show status breakdown for each league with clear indicators.

**Actual:** Shows recent picks without current week context.

**Verdict:** Completely fails to help user understand action needed.

---

## Positive Findings

### ✅ Command Logging Works Correctly
The webhook handler correctly logs all SMS commands to `sms_commands` table (line 523-530):

```typescript
await supabaseAdmin.from('sms_commands').insert({
  phone,
  user_id: user?.id || null,
  command,
  raw_message: text,
  parsed_data: parsedData,
  response_sent: response,
});
```

**Verified Fields:**
- `phone` - Normalized phone number
- `user_id` - User UUID or null if unregistered
- `command` - "STATUS"
- `raw_message` - Original SMS body
- `parsed_data` - JSONB with command + args
- `response_sent` - Full response text
- `processed_at` - Timestamp (default NOW())

---

### ✅ Phone Validation Works
Correctly rejects unregistered phone numbers:
```
Response: "Phone not registered. Visit rgfl.app to link your phone."
```

---

### ✅ TwiML Response Format Correct
Returns valid TwiML XML with escaped special characters (lines 532-539).

---

## Comparison with Other SMS Commands

### PICK Command (Lines 381-464)
**Functionality:** Submit weekly pick by castaway name
**Status Check:** ✅ Validates current episode exists and is accepting picks
**Action:** Updates `weekly_picks` table

**Key Difference:** PICK command knows about current episode because it needs to insert picks. STATUS should use same logic.

### TEAM Command (Lines 491-511)
**Functionality:** Show user's roster
**Data Shown:**
- Castaway name
- Castaway status (active/eliminated)
- League name

**Key Difference:** TEAM shows castaway status (active/eliminated) which STATUS should also show for context.

---

## Security & Privacy Analysis

### ✅ PASS: User Authorization
Query filters by `user_id` from phone lookup, preventing users from seeing other users' data.

### ✅ PASS: Twilio Webhook Validation
Request signature validated (line 275), prevents spoofing attacks.

### ⚠ CONCERN: SMS Character Limit
SMS messages limited to 160 characters (standard) or 1600 characters (concatenated).

**Current Response Example:**
```
Recent picks:
Tony Vlachos - My League
Sarah Lacina - Global League
Parvati Shallow - My League
Sandra Diaz-Twine - My League
Rob Mariano - My League
```

If user in 5 leagues with long names, could exceed 160 chars and get split into multiple messages. Not a bug but worth noting for UX.

---

## User Experience Issues

### Issue 1: No Actionable Information
User texts STATUS expecting to know if they need to do something. Current response doesn't tell them if action is needed.

**User Mental Model:**
"Did I submit my pick for this week? Do I have time to change it?"

**Actual Information Provided:**
"Here are your last 5 picks from whenever."

**Gap:** Massive disconnect between user intent and system response.

---

### Issue 2: Historical Data Without Context
Showing last 5 picks is useful for history, but without episode numbers and dates, it's just a list of names.

**Better UX:**
```
Week 5: Tony (My League) - 45 pts
Week 4: Sarah (My League) - 38 pts [AUTO]
Week 3: Parvati (My League) - 52 pts

Total: 245 points (3rd place)
Picks lock Wed 3pm PST
```

---

### Issue 3: No Calls to Action
If user hasn't submitted pick, response should guide them to action:
```
⚠ Week 5 pick due Wed 3pm!
Submit at rgfl.app or text:
PICK [castaway name]
```

---

## Recommendations

### Priority 1: Implement Current Week Status Check
1. Query current/next episode from `episodes` table
2. For each league user is in:
   - Check if pick submitted for current episode
   - Show deadline time
   - Show pick if submitted, "No pick yet" if not
3. Show total points from `league_members`

### Priority 2: Add Episode Context to Historical Picks
- Include `episodes(number)` in query
- Format as "Week X: [castaway] ([league])"

### Priority 3: Add Status Indicators
- Show if pick was auto-picked
- Show if castaway eliminated
- Show urgency if deadline approaching

### Priority 4: Improve Multi-League UX
- Group by league
- Show points per league
- Indicate if user is eliminated from any league

---

## Test Execution Status

### Automated Testing: NOT POSSIBLE
Cannot execute automated tests because:
1. Requires Twilio webhook simulation with valid signature
2. Requires test phone numbers registered in users table
3. Requires test league/episode/pick data in database
4. Production database should not be used for testing

### Manual Testing: PARTIAL
Code analysis completed via static analysis. Dynamic testing requires:
1. Test environment with Supabase database
2. Test Twilio account or webhook simulator
3. Test user with registered phone

---

## Verification Checklist

| Requirement | Expected | Actual | Status |
|-------------|----------|--------|--------|
| Shows if current week pick submitted | Yes | No | ❌ FAIL |
| Shows if current week pick missed | Yes | No | ❌ FAIL |
| Shows current points total | Yes | No | ❌ FAIL |
| Shows recent picks | Up to 5 | Yes | ✅ PASS |
| Logs command to sms_commands table | Yes | Yes | ✅ PASS |
| Validates user phone registered | Yes | Yes | ✅ PASS |
| Returns valid TwiML response | Yes | Yes | ✅ PASS |
| Handles unregistered phone gracefully | Yes | Yes | ✅ PASS |

**PASS Rate: 50% (4/8)**

---

## Impact Assessment

### User Impact: HIGH
Users relying on SMS for status checks will not get the information they need. This undermines the value proposition of SMS commands.

### Business Impact: MEDIUM
Feature exists but doesn't deliver expected value. Users may stop using SMS commands, reducing engagement and mobile accessibility.

### Technical Debt: LOW
Fix is straightforward - query correct tables and format response better. No architectural changes needed.

---

## Suggested Implementation (Pseudocode)

```typescript
case 'STATUS': {
  if (!user) {
    response = 'Phone not registered. Visit rgfl.app to link your phone.';
    break;
  }

  // 1. Get current episode
  const { data: currentEpisode } = await supabaseAdmin
    .from('episodes')
    .select('id, number, picks_lock_at')
    .gte('picks_lock_at', new Date().toISOString())
    .order('picks_lock_at', { ascending: true })
    .limit(1)
    .single();

  // 2. Get user's leagues with points
  const { data: leagues } = await supabaseAdmin
    .from('league_members')
    .select('league_id, total_points, rank, leagues(name)')
    .eq('user_id', user.id);

  if (!leagues || leagues.length === 0) {
    response = 'You haven\'t joined any leagues yet. Visit rgfl.app to join.';
    break;
  }

  let responseLines = [];

  // 3. Show current week status if episode exists
  if (currentEpisode) {
    responseLines.push(`Week ${currentEpisode.number} Status:`);

    for (const league of leagues) {
      // Check if pick submitted for this episode
      const { data: pick } = await supabaseAdmin
        .from('weekly_picks')
        .select('castaway_id, status, castaways(name)')
        .eq('user_id', user.id)
        .eq('league_id', league.league_id)
        .eq('episode_id', currentEpisode.id)
        .single();

      if (pick) {
        const statusIcon = pick.status === 'auto_picked' ? '[AUTO]' : '✓';
        responseLines.push(`${statusIcon} ${pick.castaways.name} (${league.leagues.name})`);
      } else {
        responseLines.push(`⚠ No pick yet (${league.leagues.name})`);
      }
    }

    // Show deadline
    const deadline = new Date(currentEpisode.picks_lock_at);
    const timeUntil = deadline - Date.now();
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));

    if (hoursUntil < 24 && hoursUntil > 0) {
      responseLines.push(`\n⏰ Picks lock in ${hoursUntil}h`);
    } else {
      responseLines.push(`\nPicks lock: ${deadline.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      })}`);
    }
  }

  // 4. Show total points
  responseLines.push('');
  for (const league of leagues) {
    const rankText = league.rank ? ` (#${league.rank})` : '';
    responseLines.push(`${league.leagues.name}: ${league.total_points} pts${rankText}`);
  }

  response = responseLines.join('\n');
  break;
}
```

**Expected Output:**
```
Week 5 Status:
✓ Tony Vlachos (My League)
⚠ No pick yet (Global League)

⏰ Picks lock in 4h

My League: 245 pts (#3)
Global League: 198 pts (#47)
```

---

## Related Bugs & Dependencies

### Related to Known Bug: Missing week_number Field
**Bug ID:** P0-5 from QA testing
**Issue:** Episodes table missing `week_number` field
**Impact on STATUS:** Cannot show "Week X" in response, must use `episode.number` instead
**Workaround:** Use `episode.number` for now

### Depends on: Episode Scheduling Jobs
If scheduled jobs for episode creation aren't working, there may be no "current episode" to check against.

---

## Conclusion

The SMS STATUS command is **functionally incomplete**. While it successfully queries and displays recent picks, it fails to provide the critical information users expect:

1. Current week pick status (submitted or missing)
2. Total points
3. Actionable information about upcoming deadlines

**This is a MEDIUM priority bug** that should be fixed before public launch. Users will text "STATUS" expecting game status, not historical pick list.

**Recommended Timeline:**
Fix in Week 2 of pre-launch bug fixing (after P0 blockers are resolved).

---

## Appendix A: Database Queries Used

### Query 1: Get Current Episode
```sql
SELECT id, number, picks_lock_at
FROM episodes
WHERE picks_lock_at >= NOW()
ORDER BY picks_lock_at ASC
LIMIT 1;
```

### Query 2: Get User's Leagues with Points
```sql
SELECT
  lm.league_id,
  lm.total_points,
  lm.rank,
  l.name as league_name
FROM league_members lm
JOIN leagues l ON l.id = lm.league_id
WHERE lm.user_id = $1;
```

### Query 3: Get Weekly Pick for Current Episode
```sql
SELECT
  wp.castaway_id,
  wp.status,
  c.name as castaway_name
FROM weekly_picks wp
JOIN castaways c ON c.id = wp.castaway_id
WHERE wp.user_id = $1
  AND wp.league_id = $2
  AND wp.episode_id = $3;
```

### Query 4: Get Recent Picks (Current Implementation)
```sql
SELECT
  c.name as castaway_name,
  l.name as league_name
FROM weekly_picks wp
JOIN castaways c ON c.id = wp.castaway_id
JOIN leagues l ON l.id = wp.league_id
WHERE wp.user_id = $1
ORDER BY wp.picked_at DESC
LIMIT 5;
```

---

## Appendix B: Test Data Requirements

To properly test STATUS command, need:

### Test User
```json
{
  "id": "uuid",
  "email": "test@rgfl.app",
  "display_name": "Test User",
  "phone": "14155551234",
  "phone_verified": true
}
```

### Test League (2 minimum)
```json
{
  "id": "uuid",
  "name": "Test League 1",
  "season_id": "active-season-uuid",
  "is_global": false
}
```

### Test League Member
```json
{
  "league_id": "test-league-uuid",
  "user_id": "test-user-uuid",
  "total_points": 245,
  "rank": 3
}
```

### Test Episode (Current)
```json
{
  "id": "uuid",
  "season_id": "active-season-uuid",
  "number": 5,
  "picks_lock_at": "2025-12-31T23:00:00Z" // Future date
}
```

### Test Weekly Picks (Mixed Status)
```json
[
  {
    "user_id": "test-user-uuid",
    "league_id": "test-league-1-uuid",
    "episode_id": "current-episode-uuid",
    "castaway_id": "tony-uuid",
    "status": "pending"
  },
  {
    "user_id": "test-user-uuid",
    "league_id": "test-league-2-uuid",
    "episode_id": "previous-episode-uuid",
    "castaway_id": "sarah-uuid",
    "status": "auto_picked"
  }
]
```

---

**Report Generated:** 2025-12-27
**Next Review:** After P0 bugs fixed
**Assigned To:** Development Team
**Estimated Fix Time:** 4-6 hours
