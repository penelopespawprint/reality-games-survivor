-- Test Script: Weekly Picks RLS Validation
-- Tests all validation scenarios for weekly_picks table

-- ============================================================================
-- SETUP: Create test data
-- ============================================================================

-- Create test season
INSERT INTO seasons (id, number, name, start_date, end_date, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  50,
  'Test Season 50',
  NOW(),
  NOW() + INTERVAL '3 months',
  'active'
);

-- Create test episode with future deadline
INSERT INTO episodes (id, season_id, number, air_date, picks_lock_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  1,
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days' - INTERVAL '5 hours'  -- 5 hours before air
);

-- Create test episode with PAST deadline (for deadline validation)
INSERT INTO episodes (id, season_id, number, air_date, picks_lock_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  2,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day' - INTERVAL '5 hours'  -- Deadline already passed
);

-- Create test castaways
-- Active castaway
INSERT INTO castaways (id, season_id, name, status)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Active Contestant',
  'active'
);

-- Eliminated castaway
INSERT INTO castaways (id, season_id, name, status, eliminated_episode_id)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Eliminated Contestant',
  'eliminated',
  '00000000-0000-0000-0000-000000000002'
);

-- Another active castaway (not on roster)
INSERT INTO castaways (id, season_id, name, status)
VALUES (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'Another Active Contestant',
  'active'
);

-- Create test league
INSERT INTO leagues (id, name, season_id, commissioner_id, is_public)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  'Test League',
  '00000000-0000-0000-0000-000000000001',
  auth.uid(),
  false
);

-- Add user as league member
INSERT INTO league_members (league_id, user_id, joined_at)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  auth.uid(),
  NOW()
);

-- Create roster entries
-- Active castaway ON roster (valid for picks)
INSERT INTO rosters (id, league_id, user_id, castaway_id, draft_round, draft_pick)
VALUES (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000020',
  auth.uid(),
  '00000000-0000-0000-0000-000000000010',
  1,
  1
);

-- Eliminated castaway ON roster (invalid - eliminated)
INSERT INTO rosters (id, league_id, user_id, castaway_id, draft_round, draft_pick)
VALUES (
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000020',
  auth.uid(),
  '00000000-0000-0000-0000-000000000011',
  1,
  2
);

-- Active castaway ON roster but DROPPED (invalid - dropped)
INSERT INTO rosters (id, league_id, user_id, castaway_id, draft_round, draft_pick, dropped_at)
VALUES (
  '00000000-0000-0000-0000-000000000032',
  '00000000-0000-0000-0000-000000000020',
  auth.uid(),
  '00000000-0000-0000-0000-000000000012',
  2,
  1,
  NOW() - INTERVAL '1 day'  -- Dropped yesterday
);

-- ============================================================================
-- TEST 1: Valid pick (should succeed)
-- ============================================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO weekly_picks (
      league_id,
      user_id,
      episode_id,
      castaway_id,
      status
    )
    VALUES (
      '00000000-0000-0000-0000-000000000020',
      auth.uid(),
      '00000000-0000-0000-0000-000000000002',  -- Future episode
      '00000000-0000-0000-0000-000000000010',  -- Active castaway on roster
      'pending'
    );
    RAISE NOTICE 'TEST 1 PASSED: Valid pick inserted successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 1 FAILED: Valid pick rejected - %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- TEST 2: Pick castaway NOT on roster (should fail)
-- ============================================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO weekly_picks (
      league_id,
      user_id,
      episode_id,
      castaway_id,
      status
    )
    VALUES (
      '00000000-0000-0000-0000-000000000020',
      auth.uid(),
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000012',  -- Not on user's roster
      'pending'
    );
    RAISE NOTICE 'TEST 2 FAILED: Pick allowed for castaway not on roster';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 2 PASSED: Pick rejected for castaway not on roster';
  END;
END $$;

-- ============================================================================
-- TEST 3: Pick eliminated castaway (should fail)
-- ============================================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO weekly_picks (
      league_id,
      user_id,
      episode_id,
      castaway_id,
      status
    )
    VALUES (
      '00000000-0000-0000-0000-000000000020',
      auth.uid(),
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000011',  -- Eliminated castaway
      'pending'
    );
    RAISE NOTICE 'TEST 3 FAILED: Pick allowed for eliminated castaway';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 3 PASSED: Pick rejected for eliminated castaway';
  END;
END $$;

-- ============================================================================
-- TEST 4: Pick after deadline (should fail)
-- ============================================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO weekly_picks (
      league_id,
      user_id,
      episode_id,
      castaway_id,
      status
    )
    VALUES (
      '00000000-0000-0000-0000-000000000020',
      auth.uid(),
      '00000000-0000-0000-0000-000000000003',  -- Past episode (deadline passed)
      '00000000-0000-0000-0000-000000000010',
      'pending'
    );
    RAISE NOTICE 'TEST 4 FAILED: Pick allowed after deadline';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4 PASSED: Pick rejected after deadline';
  END;
END $$;

-- ============================================================================
-- TEST 5: Update pick to invalid castaway (should fail)
-- ============================================================================
DO $$
DECLARE
  v_pick_id UUID;
BEGIN
  -- Get the valid pick ID from TEST 1
  SELECT id INTO v_pick_id
  FROM weekly_picks
  WHERE episode_id = '00000000-0000-0000-0000-000000000002'
    AND user_id = auth.uid()
  LIMIT 1;

  IF v_pick_id IS NOT NULL THEN
    BEGIN
      UPDATE weekly_picks
      SET castaway_id = '00000000-0000-0000-0000-000000000011'  -- Eliminated castaway
      WHERE id = v_pick_id;

      RAISE NOTICE 'TEST 5 FAILED: Update allowed to eliminated castaway';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'TEST 5 PASSED: Update rejected for eliminated castaway';
    END;
  ELSE
    RAISE NOTICE 'TEST 5 SKIPPED: No valid pick found to update';
  END IF;
END $$;

-- ============================================================================
-- TEST 6: Update locked pick (should fail)
-- ============================================================================
DO $$
DECLARE
  v_pick_id UUID;
BEGIN
  -- Get the valid pick ID from TEST 1
  SELECT id INTO v_pick_id
  FROM weekly_picks
  WHERE episode_id = '00000000-0000-0000-0000-000000000002'
    AND user_id = auth.uid()
  LIMIT 1;

  IF v_pick_id IS NOT NULL THEN
    -- First lock the pick (as service role would do)
    UPDATE weekly_picks
    SET status = 'locked', locked_at = NOW()
    WHERE id = v_pick_id;

    -- Now try to update it
    BEGIN
      UPDATE weekly_picks
      SET castaway_id = '00000000-0000-0000-0000-000000000010'
      WHERE id = v_pick_id;

      RAISE NOTICE 'TEST 6 FAILED: Update allowed on locked pick';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'TEST 6 PASSED: Update rejected for locked pick';
    END;
  ELSE
    RAISE NOTICE 'TEST 6 SKIPPED: No valid pick found to lock';
  END IF;
END $$;

-- ============================================================================
-- TEST 7: Valid update (should succeed)
-- ============================================================================
DO $$
DECLARE
  v_pick_id UUID;
BEGIN
  -- Create a fresh pending pick for this test
  INSERT INTO weekly_picks (
    league_id,
    user_id,
    episode_id,
    castaway_id,
    status
  )
  VALUES (
    '00000000-0000-0000-0000-000000000020',
    auth.uid(),
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000010',
    'pending'
  )
  RETURNING id INTO v_pick_id;

  BEGIN
    UPDATE weekly_picks
    SET castaway_id = NULL  -- Clear the pick
    WHERE id = v_pick_id;

    RAISE NOTICE 'TEST 7 PASSED: Valid update allowed';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 7 FAILED: Valid update rejected - %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- CLEANUP: Remove test data
-- ============================================================================
DELETE FROM weekly_picks WHERE league_id = '00000000-0000-0000-0000-000000000020';
DELETE FROM rosters WHERE league_id = '00000000-0000-0000-0000-000000000020';
DELETE FROM league_members WHERE league_id = '00000000-0000-0000-0000-000000000020';
DELETE FROM leagues WHERE id = '00000000-0000-0000-0000-000000000020';
DELETE FROM castaways WHERE season_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM episodes WHERE season_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM seasons WHERE id = '00000000-0000-0000-0000-000000000001';

RAISE NOTICE '===========================================';
RAISE NOTICE 'RLS VALIDATION TESTS COMPLETE';
RAISE NOTICE '===========================================';
