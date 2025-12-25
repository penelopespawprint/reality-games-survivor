-- Migration: Additional database constraints for data integrity

-- ============================================
-- ROSTER CONSTRAINTS
-- ============================================

-- Draft round must be positive (1 or 2 for this game)
ALTER TABLE rosters
ADD CONSTRAINT rosters_draft_round_range
CHECK (draft_round >= 1 AND draft_round <= 10);

-- Draft pick must be positive
ALTER TABLE rosters
ADD CONSTRAINT rosters_draft_pick_positive
CHECK (draft_pick >= 1);

-- ============================================
-- EPISODE CONSTRAINTS
-- ============================================

-- Episode number must be positive
ALTER TABLE episodes
ADD CONSTRAINT episodes_number_positive
CHECK (number >= 1 AND number <= 20);

-- ============================================
-- SCORING RULES CONSTRAINTS
-- ============================================

-- Points should be in reasonable range (-1000 to 1000)
ALTER TABLE scoring_rules
ADD CONSTRAINT scoring_rules_points_range
CHECK (points >= -1000 AND points <= 1000);

-- Sort order should be non-negative
ALTER TABLE scoring_rules
ADD CONSTRAINT scoring_rules_sort_order_positive
CHECK (sort_order >= 0);

-- ============================================
-- EPISODE SCORES CONSTRAINTS
-- ============================================

-- Quantity must be positive
ALTER TABLE episode_scores
ADD CONSTRAINT episode_scores_quantity_positive
CHECK (quantity >= 1);

-- ============================================
-- LEAGUE MEMBERS CONSTRAINTS
-- ============================================

-- Total points should be non-negative (can be 0 at start)
ALTER TABLE league_members
ADD CONSTRAINT league_members_total_points_nonnegative
CHECK (total_points >= 0);

-- Rank should be positive if set
ALTER TABLE league_members
ADD CONSTRAINT league_members_rank_positive
CHECK (rank IS NULL OR rank >= 1);

-- Draft position should be positive if set
ALTER TABLE league_members
ADD CONSTRAINT league_members_draft_position_positive
CHECK (draft_position IS NULL OR draft_position >= 1);

-- ============================================
-- WEEKLY PICKS CONSTRAINTS
-- ============================================

-- Points earned can be negative (penalties) but bounded
ALTER TABLE weekly_picks
ADD CONSTRAINT weekly_picks_points_range
CHECK (points_earned >= -1000 AND points_earned <= 1000);

-- ============================================
-- SEASON CONSTRAINTS
-- ============================================

-- Season number must be positive
ALTER TABLE seasons
ADD CONSTRAINT seasons_number_positive
CHECK (number >= 1);
