# Weekly Picks Validation - Quick Reference

## TL;DR

Weekly picks are validated by a PostgreSQL trigger that enforces:
- ✓ Castaway must be on user's roster (not dropped)
- ✓ Castaway must be active (not eliminated)
- ✓ Pick must be before deadline
- ✓ Only API can write (service role requirement)

## Quick Checks

```sql
-- Is validation active?
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'weekly_picks'::regclass
  AND tgname = 'validate_weekly_pick_trigger';
-- Should return: validate_weekly_pick_trigger ✓

-- Any data integrity violations?
SELECT COUNT(*) FROM weekly_picks wp
WHERE wp.castaway_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM rosters r
    WHERE r.user_id = wp.user_id
      AND r.league_id = wp.league_id
      AND r.castaway_id = wp.castaway_id
      AND r.dropped_at IS NULL
  );
-- Should return: 0 ✓
```

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "must be submitted through the API" | Frontend tried direct write | Use API endpoint |
| "not a member of this league" | User not in league | Check league membership |
| "not on your roster" | Castaway not drafted | Pick different castaway |
| "Castaway is eliminated" | Castaway voted out | Pick active castaway |
| "Picks are locked" | After deadline | Wait for next episode |

## Files

| File | Purpose |
|------|---------|
| `P1-RLS-ROSTER-VALIDATION-SUMMARY.md` | Complete summary |
| `test-rls-weekly-picks.sql` | Test suite |
| `verify-rls-policies.sql` | Quick verification |
| `docs/WEEKLY-PICKS-VALIDATION-README.md` | Implementation guide |

## Validation Flow

```
User → API → Trigger → Database
       ↓       ↓
       ✓       ✓ Validates:
       |       - Service role
       |       - League member
       |       - On roster
       |       - Active castaway
       |       - Before deadline
```

## API Usage

```javascript
// Correct (API endpoint)
POST /api/leagues/:leagueId/picks
{
  "episodeId": "...",
  "castawayId": "..."
}

// Wrong (direct Supabase write)
supabase.from('weekly_picks').insert({ ... })  // ❌ BLOCKED
```

## Active Migration

**Migration**: `weekly_picks_security` (20251227230255)
**Status**: Active ✓
**Method**: PostgreSQL trigger validation
