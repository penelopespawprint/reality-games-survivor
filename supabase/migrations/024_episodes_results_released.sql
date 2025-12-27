-- Migration 024: Track Episode Results Release
-- Adds tracking for when episode results are officially released to players

-- Track when episode results were released to players
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS results_released_at TIMESTAMPTZ;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS results_released_by UUID REFERENCES users(id);

-- Create index (if not exists)
CREATE INDEX IF NOT EXISTS idx_episodes_results_released_at ON episodes(results_released_at);

-- Add scoring_finalized_at if not exists (needed for release logic)
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS scoring_finalized_at TIMESTAMPTZ;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS scoring_finalized_by UUID REFERENCES users(id);
