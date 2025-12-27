# Weekly Picks Validation - Implementation Guide

## Overview

The `weekly_picks` table has comprehensive database-level validation that prevents invalid picks through PostgreSQL triggers. This ensures data integrity regardless of how clients interact with the database.

## Security Model

### Trigger-Based Validation (Active)

All INSERT/UPDATE operations are validated by the `validate_weekly_pick()` trigger function.

**Key Features:**
- Service role requirement (prevents frontend bypass)
- League membership validation
- Roster ownership validation
- Castaway status validation (must be active)
- Deadline enforcement

## Validation Rules

### 1. Service Role Requirement
Only the Express API (using service role credentials) can write to `weekly_picks`.

```sql
IF auth.role() != 'service_role' THEN
  RAISE EXCEPTION 'Weekly picks must be submitted through the API';
END IF
```

**Why:** Prevents frontend from bypassing API validation by writing directly to Supabase.

### 2. League Membership
User must be a member of the league.

```sql
SELECT COUNT(*) FROM league_members
WHERE league_id = NEW.league_id AND user_id = NEW.user_id
-- Must be > 0
```

**Error:** "User is not a member of this league"

### 3. Roster Ownership
Castaway must be on user's roster and not dropped.

```sql
SELECT COUNT(*) FROM rosters
WHERE league_id = NEW.league_id
  AND user_id = NEW.user_id
  AND castaway_id = NEW.castaway_id
  AND dropped_at IS NULL
-- Must be > 0
```

**Error:** "Castaway is not on your roster"

### 4. Castaway Status
Castaway must be active (not eliminated).

```sql
SELECT status FROM castaways
WHERE id = NEW.castaway_id
-- Must be 'active'
```

**Error:** "Castaway is eliminated"

### 5. Deadline Enforcement
Pick must be made before episode lock time.

```sql
SELECT picks_lock_at FROM episodes
WHERE id = NEW.episode_id
-- NOW() must be < picks_lock_at
```

**Error:** "Picks are locked for this episode"

## Database Objects

### Trigger
```sql
CREATE TRIGGER validate_weekly_pick_trigger
  BEFORE INSERT OR UPDATE ON weekly_picks
  FOR EACH ROW
  EXECUTE FUNCTION validate_weekly_pick();
```

### Function
```sql
CREATE OR REPLACE FUNCTION validate_weekly_pick()
RETURNS TRIGGER AS $$
-- See full implementation in migration
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API Integration

### Express API (Correct Way)
```javascript
// API uses service role
const { data, error } = await supabaseServiceRole
  .from('weekly_picks')
  .insert({
    league_id,
    user_id,
    episode_id,
    castaway_id,
    status: 'pending'
  });

// Trigger validates automatically
// Returns error if validation fails
```

### Frontend (Blocked)
```javascript
// This will FAIL - frontend uses anon key
const { data, error } = await supabase
  .from('weekly_picks')
  .insert({ ... });

// Error: "Weekly picks must be submitted through the API"
```

## Verification

### Check Implementation
```sql
-- Verify trigger exists
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'weekly_picks'::regclass
  AND tgname = 'validate_weekly_pick_trigger';
-- Should return: validate_weekly_pick_trigger

-- Verify function exists
SELECT proname FROM pg_proc
WHERE proname = 'validate_weekly_pick';
-- Should return: validate_weekly_pick
```

### Check Data Integrity
```sql
-- Should return 0 violations
SELECT COUNT(*) FROM weekly_picks wp
WHERE wp.castaway_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM rosters r
    WHERE r.user_id = wp.user_id
      AND r.league_id = wp.league_id
      AND r.castaway_id = wp.castaway_id
      AND r.dropped_at IS NULL
  );
```

## Migration History

| Migration | Version | Status |
|-----------|---------|--------|
| `add_weekly_picks_validation_policies` | 20251227230129 | Superseded by trigger approach |
| `weekly_picks_security` | 20251227230255 | **Active** |

## Error Handling

### API Error Handling
```javascript
try {
  await submitPick(userId, leagueId, episodeId, castawayId);
} catch (error) {
  if (error.message.includes('not on your roster')) {
    // Handle roster violation
  } else if (error.message.includes('eliminated')) {
    // Handle eliminated castaway
  } else if (error.message.includes('locked')) {
    // Handle deadline passed
  }
  // etc.
}
```

### Error Messages
| Validation | Error Message |
|------------|---------------|
| Service role | "Weekly picks must be submitted through the API" |
| League membership | "User is not a member of this league" |
| Roster ownership | "Castaway is not on your roster" |
| Castaway status | "Castaway is eliminated" |
| Deadline | "Picks are locked for this episode" |

## Testing

### Run Verification Script
```bash
# From web directory
psql $SUPABASE_DB_URL -f verify-rls-policies.sql
```

### Expected Output
```
1. Validation Trigger: ✓ ACTIVE
2. Validation Function: ✓ EXISTS
3. RLS Enabled: ✓ YES
4. Roster Violations: 0 (expect 0) ✓
5. Eliminated Violations: 0 (expect 0) ✓

✓✓✓ ALL CHECKS PASSED ✓✓✓
```

## Benefits

1. **Security**: Frontend cannot bypass API validation
2. **Data Integrity**: Invalid picks are impossible at database level
3. **Reliability**: Even if API has bugs, database enforces rules
4. **Auditability**: Single source of truth for validation logic
5. **Performance**: Database-optimized constraint checking

## Architecture

```
Frontend (React)
    │
    ├─❌ Direct write to Supabase (BLOCKED)
    │
    └─✓ POST /api/picks
           │
           ├─ Express API validates
           │
           └─ Writes via service role
                  │
                  └─ PostgreSQL Trigger validates
                         │
                         ├─ Service role check
                         ├─ League membership check
                         ├─ Roster ownership check
                         ├─ Castaway status check
                         └─ Deadline check
```

## Related Files

- **Summary**: `/Users/richard/Projects/reality-games-survivor/web/P1-RLS-ROSTER-VALIDATION-SUMMARY.md`
- **Test Script**: `/Users/richard/Projects/reality-games-survivor/web/test-rls-weekly-picks.sql`
- **Verification Script**: `/Users/richard/Projects/reality-games-survivor/web/verify-rls-policies.sql`
- **This README**: `/Users/richard/Projects/reality-games-survivor/web/docs/WEEKLY-PICKS-VALIDATION-README.md`

## Support

For questions or issues with weekly picks validation:
1. Check error message from API
2. Run verification script to check database state
3. Review trigger function implementation
4. Check API service role configuration
