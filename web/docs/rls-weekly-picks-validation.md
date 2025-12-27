# Weekly Picks RLS Validation Policies

## Overview

Row Level Security (RLS) policies on the `weekly_picks` table ensure that users can only make valid picks by enforcing business rules at the database layer.

## Validation Rules

### INSERT Policy: `weekly_picks_insert_validated`

Enforces the following validations when creating a new pick:

1. **User Ownership**: User must own the pick (`user_id = auth.uid()`)
2. **League Membership**: User must be a member of the league
3. **Roster Validation**: Castaway must be on user's roster and not dropped
4. **Castaway Status**: Castaway must be active (not eliminated)
5. **Deadline Enforcement**: Current time must be before the episode's pick deadline

### UPDATE Policy: `weekly_picks_update_validated`

Enforces the following validations when updating a pick:

**USING clause (determines which rows can be updated):**
1. **User Ownership**: User must own the pick
2. **Status Check**: Pick must be in 'pending' status (not locked or auto-picked)
3. **Deadline Check**: Deadline must not have passed

**WITH CHECK clause (validates the new values):**
1. **User Ownership**: User still owns the pick after update
2. **Castaway Validation**: If changing castaway_id:
   - Allow NULL (clearing the pick)
   - If not NULL, castaway must be on roster and active
3. **Deadline Check**: Deadline must not have passed

## Policy Logic

### Roster Ownership Check
```sql
EXISTS (
  SELECT 1
  FROM rosters
  WHERE rosters.user_id = weekly_picks.user_id
    AND rosters.league_id = weekly_picks.league_id
    AND rosters.castaway_id = weekly_picks.castaway_id
    AND rosters.dropped_at IS NULL
)
```

### Castaway Active Check
```sql
EXISTS (
  SELECT 1
  FROM castaways
  WHERE castaways.id = weekly_picks.castaway_id
    AND castaways.status = 'active'
)
```

### Deadline Check
```sql
EXISTS (
  SELECT 1
  FROM episodes
  WHERE episodes.id = weekly_picks.episode_id
    AND NOW() < episodes.picks_lock_at
)
```

## Test Scenarios

### Valid Pick (Should Succeed)
- User is league member
- Castaway is on user's roster
- Castaway is active
- Deadline has not passed
- Pick status is 'pending'

### Invalid Picks (Should Fail)

#### 1. Castaway Not on Roster
```sql
-- Attempt to pick "Rob Mariano" when not on roster
-- ERROR: new row violates row-level security policy
```

#### 2. Eliminated Castaway
```sql
-- Attempt to pick castaway with status = 'eliminated'
-- ERROR: new row violates row-level security policy
```

#### 3. Dropped Roster Entry
```sql
-- Attempt to pick castaway where rosters.dropped_at IS NOT NULL
-- ERROR: new row violates row-level security policy
```

#### 4. After Deadline
```sql
-- Attempt to pick when NOW() > episodes.picks_lock_at
-- ERROR: new row violates row-level security policy
```

#### 5. Update Locked Pick
```sql
-- Attempt to update when status IN ('locked', 'auto_picked')
-- ERROR: No rows affected (USING clause prevents update)
```

## Verification Queries

### Check Pick Validity
```sql
SELECT
  wp.id,
  wp.user_id,
  wp.league_id,
  wp.episode_id,
  wp.castaway_id,
  c.name as castaway_name,

  -- Validation checks
  EXISTS (
    SELECT 1 FROM rosters r
    WHERE r.user_id = wp.user_id
      AND r.league_id = wp.league_id
      AND r.castaway_id = wp.castaway_id
      AND r.dropped_at IS NULL
  ) as on_roster,

  c.status as castaway_status,
  c.status = 'active' as is_active,

  e.picks_lock_at,
  NOW() < e.picks_lock_at as before_deadline,

  wp.status,
  wp.status = 'pending' as can_update

FROM weekly_picks wp
JOIN castaways c ON c.id = wp.castaway_id
JOIN episodes e ON e.id = wp.episode_id
WHERE wp.user_id = auth.uid();
```

### Find Invalid Picks (Should Be Empty)
```sql
-- Picks with castaway not on roster
SELECT
  wp.id,
  wp.user_id,
  c.name as castaway_name,
  'NOT_ON_ROSTER' as violation
FROM weekly_picks wp
JOIN castaways c ON c.id = wp.castaway_id
WHERE NOT EXISTS (
  SELECT 1 FROM rosters r
  WHERE r.user_id = wp.user_id
    AND r.league_id = wp.league_id
    AND r.castaway_id = wp.castaway_id
    AND r.dropped_at IS NULL
)

UNION ALL

-- Picks with eliminated castaway
SELECT
  wp.id,
  wp.user_id,
  c.name as castaway_name,
  'ELIMINATED_CASTAWAY' as violation
FROM weekly_picks wp
JOIN castaways c ON c.id = wp.castaway_id
WHERE c.status != 'active'

UNION ALL

-- Picks made after deadline
SELECT
  wp.id,
  wp.user_id,
  c.name as castaway_name,
  'AFTER_DEADLINE' as violation
FROM weekly_picks wp
JOIN castaways c ON c.id = wp.castaway_id
JOIN episodes e ON e.id = wp.episode_id
WHERE wp.picked_at > e.picks_lock_at;
```

## Migration Applied

**File**: `add_weekly_picks_validation_policies.sql`

**Actions**:
1. Dropped old `weekly_picks_insert_own` policy
2. Created new `weekly_picks_insert_validated` policy with comprehensive checks
3. Dropped old `weekly_picks_update_own` policy
4. Created new `weekly_picks_update_validated` policy with comprehensive checks
5. Added policy comments for documentation

## Benefits

1. **Data Integrity**: Invalid picks are impossible at the database level
2. **Security**: Business rules enforced regardless of client implementation
3. **Audit Trail**: All validation happens in one place (database)
4. **Performance**: Database-level checks are optimized by PostgreSQL
5. **Reliability**: Even if API has bugs, database prevents invalid data

## Important Notes

1. **Service Role Bypass**: The `service_bypass_weekly_picks` policy allows service role to bypass these checks for system operations (e.g., auto-pick functionality)

2. **Admin Bypass**: The `weekly_picks_admin` policy allows admins to bypass these checks for manual corrections

3. **Null Picks**: Users can set `castaway_id = NULL` to clear their pick (as long as status is 'pending' and before deadline)

4. **Status Transitions**: Once a pick is 'locked' or 'auto_picked', users cannot update it (even admins should use service role)

## Testing

Run the test script to verify all validations:
```bash
psql $DATABASE_URL -f test-rls-weekly-picks.sql
```

Expected output:
- TEST 1 PASSED: Valid pick inserted successfully
- TEST 2 PASSED: Pick rejected for castaway not on roster
- TEST 3 PASSED: Pick rejected for eliminated castaway
- TEST 4 PASSED: Pick rejected after deadline
- TEST 5 PASSED: Update rejected for eliminated castaway
- TEST 6 PASSED: Update rejected for locked pick
- TEST 7 PASSED: Valid update allowed
