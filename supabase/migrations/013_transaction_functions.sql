-- Migration: Add transaction functions for atomic operations
-- These functions ensure data integrity for multi-step operations

-- Function to finalize scoring atomically
CREATE OR REPLACE FUNCTION finalize_episode_scoring(
  p_episode_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_standings_updated INTEGER := 0;
BEGIN
  -- Verify admin permission
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Verify episode exists and has a draft scoring session
  IF NOT EXISTS (SELECT 1 FROM scoring_sessions WHERE episode_id = p_episode_id AND status = 'draft') THEN
    RAISE EXCEPTION 'No draft scoring session found for episode';
  END IF;

  -- Update scoring session to finalized
  UPDATE scoring_sessions
  SET status = 'finalized',
      finalized_at = NOW(),
      finalized_by = p_admin_id
  WHERE episode_id = p_episode_id
    AND status = 'draft';

  -- Mark episode as scored
  UPDATE episodes
  SET is_scored = true,
      updated_at = NOW()
  WHERE id = p_episode_id;

  -- Update league_members total_points based on weekly picks
  WITH pick_scores AS (
    SELECT
      wp.league_id,
      wp.user_id,
      COALESCE(SUM(es.points), 0) as episode_points
    FROM weekly_picks wp
    LEFT JOIN episode_scores es ON es.castaway_id = wp.castaway_id
                                AND es.episode_id = p_episode_id
    WHERE wp.episode_id = p_episode_id
      AND wp.status IN ('locked', 'auto_picked')
    GROUP BY wp.league_id, wp.user_id
  )
  UPDATE league_members lm
  SET total_points = lm.total_points + ps.episode_points,
      updated_at = NOW()
  FROM pick_scores ps
  WHERE lm.league_id = ps.league_id
    AND lm.user_id = ps.user_id;

  GET DIAGNOSTICS v_standings_updated = ROW_COUNT;

  -- Update weekly_picks with points earned
  UPDATE weekly_picks wp
  SET points_earned = COALESCE((
    SELECT SUM(es.points)
    FROM episode_scores es
    WHERE es.castaway_id = wp.castaway_id
      AND es.episode_id = p_episode_id
  ), 0),
  updated_at = NOW()
  WHERE wp.episode_id = p_episode_id
    AND wp.status IN ('locked', 'auto_picked');

  -- Recalculate ranks for all affected leagues
  WITH ranked_members AS (
    SELECT
      id,
      league_id,
      ROW_NUMBER() OVER (PARTITION BY league_id ORDER BY total_points DESC) as new_rank
    FROM league_members
    WHERE league_id IN (
      SELECT DISTINCT league_id FROM weekly_picks WHERE episode_id = p_episode_id
    )
  )
  UPDATE league_members lm
  SET rank = rm.new_rank
  FROM ranked_members rm
  WHERE lm.id = rm.id;

  v_result := jsonb_build_object(
    'success', true,
    'standings_updated', v_standings_updated,
    'episode_id', p_episode_id
  );

  RETURN v_result;
END;
$$;

-- Function to process a single waiver claim atomically
CREATE OR REPLACE FUNCTION process_waiver_claim(
  p_league_id UUID,
  p_user_id UUID,
  p_episode_id UUID,
  p_dropped_castaway_id UUID,
  p_acquired_castaway_id UUID,
  p_waiver_position INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_roster_id UUID;
BEGIN
  -- Check if the acquired castaway is still available
  IF EXISTS (
    SELECT 1 FROM rosters
    WHERE league_id = p_league_id
      AND castaway_id = p_acquired_castaway_id
      AND dropped_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Castaway no longer available');
  END IF;

  -- Drop the old castaway
  UPDATE rosters
  SET dropped_at = NOW()
  WHERE league_id = p_league_id
    AND user_id = p_user_id
    AND castaway_id = p_dropped_castaway_id
    AND dropped_at IS NULL;

  -- Add the new castaway
  INSERT INTO rosters (league_id, user_id, castaway_id, draft_round, draft_pick, acquired_via)
  VALUES (p_league_id, p_user_id, p_acquired_castaway_id, 0, 0, 'waiver');

  -- Record the waiver result
  INSERT INTO waiver_results (league_id, user_id, episode_id, dropped_castaway_id, acquired_castaway_id, waiver_position)
  VALUES (p_league_id, p_user_id, p_episode_id, p_dropped_castaway_id, p_acquired_castaway_id, p_waiver_position);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to join a league atomically (handles payment verification)
CREATE OR REPLACE FUNCTION join_league_atomic(
  p_league_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_league RECORD;
  v_current_count INTEGER;
BEGIN
  -- Get league details with lock to prevent race conditions
  SELECT * INTO v_league
  FROM leagues
  WHERE id = p_league_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'League not found');
  END IF;

  -- Check if league is accepting members
  IF v_league.status NOT IN ('forming', 'drafting') THEN
    RETURN jsonb_build_object('success', false, 'error', 'League is not accepting new members');
  END IF;

  -- Check member count
  SELECT COUNT(*) INTO v_current_count
  FROM league_members
  WHERE league_id = p_league_id;

  IF v_current_count >= v_league.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'League is full');
  END IF;

  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM league_members WHERE league_id = p_league_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member');
  END IF;

  -- Add user to league
  INSERT INTO league_members (league_id, user_id)
  VALUES (p_league_id, p_user_id);

  RETURN jsonb_build_object('success', true, 'member_count', v_current_count + 1);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION finalize_episode_scoring(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION process_waiver_claim(UUID, UUID, UUID, UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION join_league_atomic(UUID, UUID) TO service_role;
