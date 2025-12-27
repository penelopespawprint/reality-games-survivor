-- Optimize global leaderboard query performance
-- Adds indexes specifically designed to eliminate N+1 queries in leaderboard endpoint

-- Index for fast leaderboard sorting by points (DESC for ORDER BY)
-- Composite index on league_id + total_points for partition-aware queries
CREATE INDEX IF NOT EXISTS idx_league_members_points_desc
ON league_members(league_id, total_points DESC);

-- Index for fast user joins in leaderboard aggregation
CREATE INDEX IF NOT EXISTS idx_league_members_user_points
ON league_members(user_id, total_points);

-- Index for fast roster lookups when checking eliminated castaways
-- Composite index on (league_id, user_id) with INCLUDE for castaway_id
-- This allows index-only scans when fetching roster data
CREATE INDEX IF NOT EXISTS idx_rosters_league_user_active
ON rosters(league_id, user_id, castaway_id)
WHERE dropped_at IS NULL;

-- Index for fast castaway status lookups (eliminated vs active)
-- Used when determining "active torches" in leaderboard summary
CREATE INDEX IF NOT EXISTS idx_castaways_id_status
ON castaways(id, status);
