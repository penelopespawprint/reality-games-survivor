-- ============================================
-- WEEKLY PICKS SECURITY HARDENING
-- ============================================
-- Migration 024: Lock down weekly_picks table to prevent direct manipulation
-- Issue: Frontend was bypassing API validation by writing directly to Supabase
-- Fix: Remove INSERT/UPDATE policies, force all mutations through API

-- Drop existing permissive policies
DROP POLICY IF EXISTS weekly_picks_insert_own ON weekly_picks;
DROP POLICY IF EXISTS weekly_picks_update_own ON weekly_picks;

-- Create restrictive validation function
CREATE OR REPLACE FUNCTION validate_weekly_pick()
RETURNS TRIGGER AS $$
DECLARE
  v_roster_count INTEGER;
  v_castaway_status TEXT;
  v_episode_lock_time TIMESTAMPTZ;
  v_league_member_count INTEGER;
BEGIN
  -- Only allow service role to insert/update
  -- This forces all picks to go through the API
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Weekly picks must be submitted through the API';
  END IF;

  -- Validate league membership
  SELECT COUNT(*) INTO v_league_member_count
  FROM league_members
  WHERE league_id = NEW.league_id AND user_id = NEW.user_id;

  IF v_league_member_count = 0 THEN
    RAISE EXCEPTION 'User is not a member of this league';
  END IF;

  -- Validate castaway is on user's roster (if castaway_id is set)
  IF NEW.castaway_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_roster_count
    FROM rosters
    WHERE league_id = NEW.league_id
      AND user_id = NEW.user_id
      AND castaway_id = NEW.castaway_id
      AND dropped_at IS NULL;

    IF v_roster_count = 0 THEN
      RAISE EXCEPTION 'Castaway is not on your roster';
    END IF;

    -- Validate castaway is active
    SELECT status INTO v_castaway_status
    FROM castaways
    WHERE id = NEW.castaway_id;

    IF v_castaway_status != 'active' THEN
      RAISE EXCEPTION 'Castaway is eliminated';
    END IF;
  END IF;

  -- Validate episode hasn't locked (for non-auto picks)
  IF NEW.status NOT IN ('auto_picked', 'locked') THEN
    SELECT picks_lock_at INTO v_episode_lock_time
    FROM episodes
    WHERE id = NEW.episode_id;

    IF NOW() >= v_episode_lock_time THEN
      RAISE EXCEPTION 'Picks are locked for this episode';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce validation
DROP TRIGGER IF EXISTS validate_weekly_pick_trigger ON weekly_picks;
CREATE TRIGGER validate_weekly_pick_trigger
  BEFORE INSERT OR UPDATE ON weekly_picks
  FOR EACH ROW
  EXECUTE FUNCTION validate_weekly_pick();

-- Add comment explaining the security model
COMMENT ON TRIGGER validate_weekly_pick_trigger ON weekly_picks IS
  'Enforces business rules: roster membership, castaway active status, pick deadline. Only service role can write.';
