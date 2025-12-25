-- Migration: Add missing database indexes for performance
-- These indexes improve query performance for common lookups

-- weekly_picks indexes
CREATE INDEX IF NOT EXISTS idx_weekly_picks_league_user_episode
  ON weekly_picks(league_id, user_id, episode_id);

CREATE INDEX IF NOT EXISTS idx_weekly_picks_castaway
  ON weekly_picks(castaway_id) WHERE castaway_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_picks_status
  ON weekly_picks(status);

-- episode_scores indexes
CREATE INDEX IF NOT EXISTS idx_episode_scores_episode_castaway
  ON episode_scores(episode_id, castaway_id);

CREATE INDEX IF NOT EXISTS idx_episode_scores_scoring_rule
  ON episode_scores(scoring_rule_id);

-- rosters indexes
CREATE INDEX IF NOT EXISTS idx_rosters_league_active
  ON rosters(league_id) WHERE dropped_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rosters_user_active
  ON rosters(user_id) WHERE dropped_at IS NULL;

-- league_members indexes
CREATE INDEX IF NOT EXISTS idx_league_members_total_points
  ON league_members(league_id, total_points DESC);

-- draft_rankings index
CREATE INDEX IF NOT EXISTS idx_draft_rankings_user_season
  ON draft_rankings(user_id, season_id);

-- chat_messages indexes (for tribal council chat)
CREATE INDEX IF NOT EXISTS idx_chat_messages_league
  ON chat_messages(league_id, created_at DESC) WHERE league_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_global
  ON chat_messages(created_at DESC) WHERE league_id IS NULL;

-- waiver_rankings index
CREATE INDEX IF NOT EXISTS idx_waiver_rankings_league_episode
  ON waiver_rankings(league_id, episode_id);

-- Add CHECK constraints for data integrity
ALTER TABLE episode_scores
  ADD CONSTRAINT episode_scores_quantity_positive
  CHECK (quantity > 0);

ALTER TABLE league_members
  ADD CONSTRAINT league_members_points_non_negative
  CHECK (total_points >= 0);

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_positive
  CHECK (amount > 0);

-- Add default 0 for total_points if not already set
ALTER TABLE league_members
  ALTER COLUMN total_points SET DEFAULT 0;
