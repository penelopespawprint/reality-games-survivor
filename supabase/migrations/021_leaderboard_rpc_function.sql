-- Create optimized RPC function for global leaderboard
-- Eliminates N+1 queries by using CTEs and JOINs in a single query
-- Returns aggregated stats per user with roster status

CREATE OR REPLACE FUNCTION get_global_leaderboard_stats()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_points BIGINT,
  league_count BIGINT,
  average_points INTEGER,
  has_eliminated_castaway BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH
    -- CTE 1: Aggregate league member stats per user
    member_stats AS (
      SELECT
        lm.user_id,
        SUM(lm.total_points) AS total_points,
        COUNT(DISTINCT lm.league_id) AS league_count,
        ROUND(AVG(lm.total_points))::INTEGER AS average_points
      FROM league_members lm
      GROUP BY lm.user_id
    ),

    -- CTE 2: Check if user has any eliminated castaways in their roster
    eliminated_status AS (
      SELECT DISTINCT
        r.user_id,
        TRUE AS has_eliminated
      FROM rosters r
      INNER JOIN castaways c ON r.castaway_id = c.id
      WHERE r.dropped_at IS NULL
        AND c.status = 'eliminated'
    )

  -- Main query: Join everything together
  SELECT
    ms.user_id,
    u.display_name,
    u.avatar_url,
    ms.total_points,
    ms.league_count,
    ms.average_points,
    COALESCE(es.has_eliminated, FALSE) AS has_eliminated_castaway
  FROM member_stats ms
  INNER JOIN users u ON ms.user_id = u.id
  LEFT JOIN eliminated_status es ON ms.user_id = es.user_id
  ORDER BY ms.total_points DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_global_leaderboard_stats() TO authenticated, service_role;
