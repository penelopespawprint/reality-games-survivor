-- Scoring Completeness Validation
-- Prevents finalization if not all active castaways have been scored
-- Returns validation status showing completeness progress

-- Helper function to check scoring completeness
CREATE OR REPLACE FUNCTION check_scoring_completeness(
  p_episode_id UUID
) RETURNS TABLE(
  is_complete BOOLEAN,
  total_castaways INTEGER,
  scored_castaways INTEGER,
  unscored_castaway_ids UUID[],
  unscored_castaway_names TEXT[]
) AS $$
DECLARE
  v_season_id UUID;
  v_total INTEGER;
  v_scored INTEGER;
  v_unscored_ids UUID[];
  v_unscored_names TEXT[];
BEGIN
  -- Get season_id from episode
  SELECT season_id INTO v_season_id
  FROM episodes
  WHERE id = p_episode_id;

  -- Count total active castaways in the season at time of episode
  SELECT COUNT(*) INTO v_total
  FROM castaways
  WHERE season_id = v_season_id
    AND status = 'active';

  -- Count castaways with at least one score for this episode
  SELECT COUNT(DISTINCT castaway_id) INTO v_scored
  FROM episode_scores
  WHERE episode_id = p_episode_id;

  -- Get IDs and names of unscored castaways
  SELECT
    ARRAY_AGG(c.id),
    ARRAY_AGG(c.name)
  INTO v_unscored_ids, v_unscored_names
  FROM castaways c
  WHERE c.season_id = v_season_id
    AND c.status = 'active'
    AND c.id NOT IN (
      SELECT DISTINCT castaway_id
      FROM episode_scores
      WHERE episode_id = p_episode_id
    );

  -- Return results
  is_complete := (v_scored >= v_total);
  total_castaways := v_total;
  scored_castaways := v_scored;
  unscored_castaway_ids := COALESCE(v_unscored_ids, '{}');
  unscored_castaway_names := COALESCE(v_unscored_names, '{}');

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update finalize_episode_scoring to validate completeness first
CREATE OR REPLACE FUNCTION finalize_episode_scoring(
  p_episode_id UUID,
  p_finalized_by UUID
) RETURNS TABLE(
  finalized BOOLEAN,
  eliminated_castaway_ids UUID[],
  standings_updated BOOLEAN,
  error_code TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_session_id UUID;
  v_session_status TEXT;
  v_season_id UUID;
  v_scores RECORD;
  v_castaway_totals JSONB := '{}';
  v_pick RECORD;
  v_league RECORD;
  v_member RECORD;
  v_ranked RECORD;
  v_rank_counter INTEGER;
  v_elim_rule_ids UUID[];
  v_eliminated_ids UUID[] := '{}';
  v_elim_score RECORD;
  v_completeness RECORD;
BEGIN
  -- Use SERIALIZABLE isolation to prevent concurrent finalization
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

  -- Get scoring session
  SELECT id, status INTO v_session_id, v_session_status
  FROM scoring_sessions
  WHERE episode_id = p_episode_id;

  IF v_session_id IS NULL THEN
    error_code := 'SESSION_NOT_FOUND';
    error_message := 'Scoring session not found';
    finalized := FALSE;
    eliminated_castaway_ids := '{}';
    standings_updated := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check if already finalized (idempotency)
  IF v_session_status = 'finalized' THEN
    -- Already finalized, return success (idempotent)
    finalized := TRUE;
    eliminated_castaway_ids := '{}';
    standings_updated := TRUE;
    error_code := NULL;
    error_message := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- VALIDATE COMPLETENESS before finalizing
  SELECT * INTO v_completeness
  FROM check_scoring_completeness(p_episode_id);

  IF NOT v_completeness.is_complete THEN
    error_code := 'SCORING_INCOMPLETE';
    error_message := format(
      'Scoring incomplete: %s of %s castaways scored. Missing: %s',
      v_completeness.scored_castaways,
      v_completeness.total_castaways,
      array_to_string(v_completeness.unscored_castaway_names, ', ')
    );
    finalized := FALSE;
    eliminated_castaway_ids := '{}';
    standings_updated := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Get season_id from episode
  SELECT season_id INTO v_season_id
  FROM episodes
  WHERE id = p_episode_id;

  -- Update scoring session
  UPDATE scoring_sessions
  SET status = 'finalized',
      finalized_at = NOW(),
      finalized_by = p_finalized_by
  WHERE id = v_session_id;

  -- Mark episode as scored
  UPDATE episodes
  SET is_scored = TRUE
  WHERE id = p_episode_id;

  -- Calculate total points per castaway from episode_scores
  FOR v_scores IN
    SELECT castaway_id, SUM(points) as total_points
    FROM episode_scores
    WHERE episode_id = p_episode_id
    GROUP BY castaway_id
  LOOP
    v_castaway_totals := jsonb_set(
      v_castaway_totals,
      ARRAY[v_scores.castaway_id::TEXT],
      to_jsonb(v_scores.total_points)
    );
  END LOOP;

  -- Update weekly picks with points earned
  FOR v_pick IN
    SELECT id, castaway_id
    FROM weekly_picks
    WHERE episode_id = p_episode_id
  LOOP
    UPDATE weekly_picks
    SET points_earned = COALESCE((v_castaway_totals->>v_pick.castaway_id::TEXT)::INTEGER, 0)
    WHERE id = v_pick.id;
  END LOOP;

  -- Update league member totals and ranks
  FOR v_league IN
    SELECT id
    FROM leagues
    WHERE season_id = v_season_id
      AND status = 'active'
  LOOP
    -- Update each member's total points
    FOR v_member IN
      SELECT user_id
      FROM league_members
      WHERE league_id = v_league.id
    LOOP
      UPDATE league_members lm
      SET total_points = COALESCE((
        SELECT SUM(points_earned)
        FROM weekly_picks
        WHERE league_id = v_league.id
          AND user_id = v_member.user_id
      ), 0)
      WHERE lm.league_id = v_league.id
        AND lm.user_id = v_member.user_id;
    END LOOP;

    -- Update ranks based on total_points
    v_rank_counter := 1;
    FOR v_ranked IN
      SELECT id
      FROM league_members
      WHERE league_id = v_league.id
      ORDER BY total_points DESC, created_at ASC
    LOOP
      UPDATE league_members
      SET rank = v_rank_counter
      WHERE id = v_ranked.id;

      v_rank_counter := v_rank_counter + 1;
    END LOOP;
  END LOOP;

  -- Handle eliminated castaways
  SELECT ARRAY_AGG(id) INTO v_elim_rule_ids
  FROM scoring_rules
  WHERE code ILIKE '%ELIM%';

  IF v_elim_rule_ids IS NOT NULL THEN
    FOR v_elim_score IN
      SELECT DISTINCT castaway_id
      FROM episode_scores
      WHERE episode_id = p_episode_id
        AND scoring_rule_id = ANY(v_elim_rule_ids)
    LOOP
      UPDATE castaways
      SET status = 'eliminated',
          eliminated_episode_id = p_episode_id
      WHERE id = v_elim_score.castaway_id;

      v_eliminated_ids := array_append(v_eliminated_ids, v_elim_score.castaway_id);
    END LOOP;
  END IF;

  -- Return success
  finalized := TRUE;
  eliminated_castaway_ids := v_eliminated_ids;
  standings_updated := TRUE;
  error_code := NULL;
  error_message := NULL;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_scoring_completeness TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_episode_scoring TO authenticated;
