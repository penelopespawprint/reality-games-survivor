-- ============================================
-- Add elimination tracking to league_members
-- Track when a user's torch has been snuffed (no active castaways)
-- ============================================

-- Add eliminated_at timestamp to track when user was eliminated
ALTER TABLE league_members
ADD COLUMN IF NOT EXISTS eliminated_at TIMESTAMPTZ;

-- Add comment explaining the field
COMMENT ON COLUMN league_members.eliminated_at IS 'Timestamp when user was eliminated from league (both castaways eliminated, torch snuffed). NULL means user is still active.';

-- Create index for querying active vs eliminated players
CREATE INDEX IF NOT EXISTS idx_league_members_eliminated
ON league_members(league_id, eliminated_at)
WHERE eliminated_at IS NULL;

-- Add constraint to ensure eliminated_at is in the past
ALTER TABLE league_members
ADD CONSTRAINT check_eliminated_at_in_past
CHECK (eliminated_at IS NULL OR eliminated_at <= NOW());
