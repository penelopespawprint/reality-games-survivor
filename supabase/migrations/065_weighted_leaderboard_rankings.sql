-- Weighted Leaderboard Rankings
-- Updates the global leaderboard RPC function to use steeper confidence penalties
-- for small sample sizes (players in fewer leagues)
--
-- Confidence formula:
-- - 1 league: 33% weight on raw score
-- - 2 leagues: 55% weight
-- - 3 leagues: 70% weight
-- - 4+ leagues: 1 - (1 / (leagueCount + 1)), asymptotically approaches 100%

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_weighted_leaderboard_rankings(UUID);

-- Create new weighted rankings function
CREATE OR REPLACE FUNCTION get_weighted_leaderboard_rankings(p_season_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_points BIGINT,
  league_count BIGINT,
  raw_average NUMERIC(10,2),
  confidence NUMERIC(5,3),
  weighted_score NUMERIC(10,2),
  has_eliminated_castaway BOOLEAN
) AS $$
DECLARE
  v_global_mean NUMERIC(10,2);
BEGIN
  -- Calculate global mean for the season
  SELECT COALESCE(AVG(lm.total_points), 25)
  INTO v_global_mean
  FROM league_members lm
  INNER JOIN leagues l ON lm.league_id = l.id
  WHERE l.season_id = p_season_id;

  RETURN QUERY
  WITH
    -- CTE 1: Aggregate league member stats per user for this season
    member_stats AS (
      SELECT
        lm.user_id,
        SUM(lm.total_points) AS total_points,
        COUNT(DISTINCT lm.league_id) AS league_count,
        ROUND(AVG(lm.total_points), 2) AS raw_average
      FROM league_members lm
      INNER JOIN leagues l ON lm.league_id = l.id
      WHERE l.season_id = p_season_id
      GROUP BY lm.user_id
    ),

    -- CTE 2: Calculate confidence based on league count
    -- Steeper penalty for small sample sizes
    confidence_calc AS (
      SELECT
        ms.user_id,
        ms.total_points,
        ms.league_count,
        ms.raw_average,
        CASE
          WHEN ms.league_count = 1 THEN 0.33
          WHEN ms.league_count = 2 THEN 0.55
          WHEN ms.league_count = 3 THEN 0.70
          ELSE ROUND(1.0 - (1.0 / (ms.league_count + 1)), 3)
        END AS confidence
      FROM member_stats ms
    ),

    -- CTE 3: Calculate weighted score
    weighted_scores AS (
      SELECT
        cc.user_id,
        cc.total_points,
        cc.league_count,
        cc.raw_average,
        cc.confidence,
        ROUND(
          (cc.raw_average * cc.confidence) + (v_global_mean * (1.0 - cc.confidence)),
          2
        ) AS weighted_score
      FROM confidence_calc cc
    ),

    -- CTE 4: Check if user has any eliminated castaways in their roster
    eliminated_status AS (
      SELECT DISTINCT
        r.user_id,
        TRUE AS has_eliminated
      FROM rosters r
      INNER JOIN castaways c ON r.castaway_id = c.id
      INNER JOIN leagues l ON r.league_id = l.id
      WHERE r.dropped_at IS NULL
        AND c.status = 'eliminated'
        AND l.season_id = p_season_id
    )

  -- Main query: Join everything together
  SELECT
    ws.user_id,
    u.display_name,
    u.avatar_url,
    ws.total_points,
    ws.league_count,
    ws.raw_average,
    ws.confidence,
    ws.weighted_score,
    COALESCE(es.has_eliminated, FALSE) AS has_eliminated_castaway
  FROM weighted_scores ws
  INNER JOIN users u ON ws.user_id = u.id
  LEFT JOIN eliminated_status es ON ws.user_id = es.user_id
  ORDER BY ws.weighted_score DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_weighted_leaderboard_rankings(UUID) TO authenticated, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION get_weighted_leaderboard_rankings(UUID) IS 
'Returns weighted leaderboard rankings for a season using Bayesian confidence scoring.
Players in more leagues get more confident (higher weight) scores.
Confidence: 1 league=33%, 2=55%, 3=70%, 4+=asymptotic to 100%';
