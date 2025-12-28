# League Join Testing Instructions

## Overview

This document provides instructions for testing the league join functionality, including the critical race condition fix.

## Files Created

1. **`QA-REPORT-LEAGUE-JOIN.md`** - Comprehensive exploratory test report
2. **`supabase/migrations/027_fix_league_capacity_race_condition.sql`** - Database migration to fix race condition
3. **`server/test-league-join.js`** - Automated test script (optional)

## Critical Bug Found

**ISSUE: Race Condition in League Capacity Validation**

Two users can join simultaneously when a league has only 1 spot remaining, causing the league to exceed its 12-player maximum.

**Root Cause:**
```typescript
// Current code (leagues.ts:205-223)
const { count } = await supabase.from('league_members')...  // Check count
if (count >= max_players) return error;                      // Reject if full
await supabaseAdmin.from('league_members').insert(...);      // Insert member
```

Between the count check and insert, another user can insert, causing overflow.

**Fix:** Database trigger that atomically checks capacity BEFORE each insert.

## Manual Testing Steps

### Prerequisites

1. Access to Supabase Dashboard
2. Active season in database
3. 2+ test user accounts

### Test 1: Basic Join Flow

```bash
# 1. Create test league via API or UI
# 2. Get league code (e.g., "ABC123")

# 3. Test public endpoint
curl https://rgfl-api-production.up.railway.app/api/leagues/code/ABC123

# Expected response:
{
  "league": {
    "id": "...",
    "name": "Test League",
    "member_count": 0,
    "max_players": 12,
    "has_password": false
  }
}

# 4. Join league (requires auth token)
curl -X POST https://rgfl-api-production.up.railway.app/api/leagues/{league-id}/join \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"

# Expected: 201 with membership object

# 5. Verify in Supabase
SELECT * FROM league_members WHERE league_id = '{league-id}';
```

### Test 2: Capacity Limit (After Migration)

```sql
-- In Supabase SQL Editor

-- 1. Create test league with max_players=3
INSERT INTO leagues (name, season_id, commissioner_id, max_players, code)
VALUES (
  'Capacity Test',
  (SELECT id FROM seasons WHERE is_active=true LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  3,
  'CAP123'
)
RETURNING *;

-- 2. Get 3 user IDs
SELECT id, email FROM users LIMIT 3;

-- 3. Add 3 members (should all succeed)
INSERT INTO league_members (league_id, user_id)
VALUES
  ((SELECT id FROM leagues WHERE code='CAP123'), '{user-id-1}'),
  ((SELECT id FROM leagues WHERE code='CAP123'), '{user-id-2}'),
  ((SELECT id FROM leagues WHERE code='CAP123'), '{user-id-3}');

-- 4. Verify count
SELECT COUNT(*) FROM league_members
WHERE league_id = (SELECT id FROM leagues WHERE code='CAP123');
-- Expected: 3

-- 5. Try to add 4th member (should FAIL with trigger error)
INSERT INTO league_members (league_id, user_id)
VALUES (
  (SELECT id FROM leagues WHERE code='CAP123'),
  (SELECT id FROM users WHERE id NOT IN (
    SELECT user_id FROM league_members
    WHERE league_id = (SELECT id FROM leagues WHERE code='CAP123')
  ) LIMIT 1)
);

-- Expected error:
-- ERROR: League "Capacity Test" is full (3 / 3 members)
-- HINT: Try joining a different league or creating your own

-- 6. Cleanup
DELETE FROM leagues WHERE code='CAP123';
```

### Test 3: Concurrent Join Simulation

This requires 2 browser sessions or API clients:

```bash
# Terminal 1
curl -X POST https://rgfl-api-production.up.railway.app/api/leagues/{league-id}/join \
  -H "Authorization: Bearer {token-user-1}" \
  -H "Content-Type: application/json" &

# Terminal 2 (run immediately after Terminal 1)
curl -X POST https://rgfl-api-production.up.railway.app/api/leagues/{league-id}/join \
  -H "Authorization: Bearer {token-user-2}" \
  -H "Content-Type: application/json" &

# Wait for both to complete
wait

# Check results:
# - Before migration: Both might succeed (overflow)
# - After migration: One succeeds, one fails with "League is full"
```

## Automated Testing (Optional)

### Setup

```bash
cd server

# Set environment variable
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"

# Run test script
node test-league-join.js
```

### Expected Output

```
🎯 Starting League Join Test Suite

============================================================

📋 SETUP: Fetching active season...
✅ Test 1: Active season exists
   Season 50: Survivor 50

📋 SETUP: Creating test user...
✅ Test 2: Create test user
   User ID: abc-123-def

...

📊 TEST SUMMARY

Total Tests: 20
✅ Passed: 19
❌ Failed: 1
⚠️  Warnings: 0

Success Rate: 95.0%

❌ FAILED TESTS:
  - Reject 13th player: Expected 400 'full' error (only if migration not applied)
```

## Migration Instructions

### 1. Review Migration

```bash
cat supabase/migrations/027_fix_league_capacity_race_condition.sql
```

### 2. Apply to Staging (Recommended First)

```bash
# If you have a staging environment
npx supabase db push --db-url {staging-database-url}
```

### 3. Verify Trigger Created

```sql
-- In Supabase SQL Editor
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'enforce_league_capacity';
```

Expected result:
| trigger_name | event_manipulation | event_object_table | action_timing |
|--------------|-------------------|-------------------|---------------|
| enforce_league_capacity | INSERT | league_members | BEFORE |

### 4. Test in Staging

Run Test 2 (Capacity Limit) above to verify trigger works.

### 5. Apply to Production

```bash
# Push migration to production
npx supabase db push

# Or via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste migration content
# 3. Run migration
# 4. Verify trigger created (query above)
```

### 6. Monitor Production

After deployment, monitor for:
- `check_violation` errors (expected when league is full)
- League overflow issues (should be zero)
- User complaints about "League is full" (expected behavior)

## Rollback Plan

If issues occur after migration:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS enforce_league_capacity ON league_members;

-- Remove function
DROP FUNCTION IF EXISTS check_league_capacity();

-- Verify removal
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'enforce_league_capacity';
-- Should return 0 rows
```

## Other Issues Found

See `QA-REPORT-LEAGUE-JOIN.md` for full details:

1. **Issue #2:** Incorrect Supabase client for count check (MEDIUM)
2. **Issue #3:** Email failure doesn't block join (LOW)
3. **Issue #4:** Client-side capacity check is race-prone (MEDIUM)
4. **Issue #5:** No handling for 429 rate limit (LOW)
5. **Issue #6:** Global league can be manually joined (MEDIUM)

## Success Criteria

After applying migration:

- ✅ No leagues exceed `max_players` limit
- ✅ Concurrent join attempts correctly rejected
- ✅ Clear error message when league is full
- ✅ Database trigger visible in `information_schema.triggers`
- ✅ No performance degradation (trigger is fast)

## Questions?

Contact: Development Team
Related Documents:
- `/QA-REPORT-LEAGUE-JOIN.md` - Full exploratory test report
- `/CLAUDE.md` - Project documentation
- `/COMPLETE_SUMMARY.md` - Overall project status
