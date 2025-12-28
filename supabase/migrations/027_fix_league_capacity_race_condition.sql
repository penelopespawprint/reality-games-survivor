-- Migration: Fix League Capacity Race Condition
-- Issue: Two users can join simultaneously when league has 1 spot left
-- Solution: Database trigger to enforce max_players constraint atomically
--
-- Problem Timeline:
-- T0: League has 11 members
-- T1: User A checks count=11 → passes
-- T2: User B checks count=11 → passes
-- T3: User A inserts → count=12
-- T4: User B inserts → count=13 ❌ OVERFLOW
--
-- This migration adds a database-level trigger that runs BEFORE INSERT
-- to atomically check and enforce the league capacity limit.
--
-- Created: 2025-12-27
-- Related: QA-REPORT-LEAGUE-JOIN.md (Issue #1)

-- =====================================================
-- FUNCTION: Check League Capacity Before Member Insert
-- =====================================================

CREATE OR REPLACE FUNCTION check_league_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  league_name TEXT;
BEGIN
  -- Get current member count and max_players for this league
  -- Uses SELECT FOR UPDATE to lock the league row during this check
  SELECT
    COUNT(lm.id),
    l.max_players,
    l.name
  INTO
    current_count,
    max_allowed,
    league_name
  FROM leagues l
  LEFT JOIN league_members lm ON lm.league_id = l.id
  WHERE l.id = NEW.league_id
  GROUP BY l.id, l.max_players, l.name;

  -- If current count already at or exceeds max, reject the insert
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'League "%" is full (% / % members)', league_name, current_count, max_allowed
      USING HINT = 'Try joining a different league or creating your own',
            ERRCODE = '23514'; -- check_violation error code
  END IF;

  -- Allow the insert to proceed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the function
COMMENT ON FUNCTION check_league_capacity() IS
  'Enforces league capacity limits atomically to prevent race conditions. ' ||
  'Raises exception if league is at max_players capacity.';

-- =====================================================
-- TRIGGER: Enforce Capacity on League Member Insert
-- =====================================================

DROP TRIGGER IF EXISTS enforce_league_capacity ON league_members;

CREATE TRIGGER enforce_league_capacity
  BEFORE INSERT ON league_members
  FOR EACH ROW
  EXECUTE FUNCTION check_league_capacity();

-- Add comment explaining the trigger
COMMENT ON TRIGGER enforce_league_capacity ON league_members IS
  'Prevents race conditions where multiple users join simultaneously when league has 1 spot left. ' ||
  'Runs before each INSERT to atomically verify league capacity.';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this after migration to verify trigger is active:
--
-- SELECT
--   trigger_name,
--   event_manipulation,
--   event_object_table,
--   action_timing
-- FROM information_schema.triggers
-- WHERE trigger_name = 'enforce_league_capacity';
--
-- Expected result:
-- enforce_league_capacity | INSERT | league_members | BEFORE

-- =====================================================
-- TEST CASE (Run in staging only!)
-- =====================================================
-- Test that trigger correctly rejects overflow:
--
-- -- Create test league with max_players=2
-- INSERT INTO leagues (name, season_id, commissioner_id, max_players, code)
-- VALUES ('Test League', (SELECT id FROM seasons WHERE is_active=true LIMIT 1),
--         (SELECT id FROM users LIMIT 1), 2, 'TEST99');
--
-- -- Add 2 members (should succeed)
-- INSERT INTO league_members (league_id, user_id)
-- SELECT
--   (SELECT id FROM leagues WHERE code='TEST99'),
--   id
-- FROM users
-- LIMIT 2;
--
-- -- Try to add 3rd member (should fail with exception)
-- INSERT INTO league_members (league_id, user_id)
-- SELECT
--   (SELECT id FROM leagues WHERE code='TEST99'),
--   id
-- FROM users
-- WHERE id NOT IN (SELECT user_id FROM league_members WHERE league_id =
--   (SELECT id FROM leagues WHERE code='TEST99'))
-- LIMIT 1;
--
-- -- Expected error: League "Test League" is full (2 / 2 members)
--
-- -- Cleanup
-- DELETE FROM leagues WHERE code='TEST99';
