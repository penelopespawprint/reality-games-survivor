-- ============================================
-- COMMISSIONER FEATURES MIGRATION
-- Adds: description, is_closed, improved member management
-- ============================================

-- Add description column to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS description TEXT;

-- Add is_closed column (prevent new members from joining)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE;

-- Add visibility enum for future use
-- is_public already exists, but we can add invite_only later if needed

-- Add co-commissioners support (optional, using JSONB array)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS co_commissioners JSONB DEFAULT '[]';

-- Create index for co-commissioners lookup
CREATE INDEX IF NOT EXISTS idx_leagues_co_commissioners ON leagues USING GIN (co_commissioners);

-- ============================================
-- HELPER FUNCTION: Check if user is commissioner or co-commissioner
-- ============================================
CREATE OR REPLACE FUNCTION is_commissioner_or_co(league_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  league_rec RECORD;
BEGIN
  SELECT commissioner_id, co_commissioners INTO league_rec
  FROM leagues WHERE id = league_uuid;

  IF league_rec IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is main commissioner
  IF league_rec.commissioner_id = auth.uid() THEN
    RETURN TRUE;
  END IF;

  -- Check if user is co-commissioner
  IF league_rec.co_commissioners ? auth.uid()::text THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- UPDATE RLS POLICIES FOR COMMISSIONER FEATURES
-- ============================================

-- Allow commissioners to update their leagues (including new fields)
DROP POLICY IF EXISTS leagues_update_commissioner ON leagues;
CREATE POLICY leagues_update_commissioner ON leagues
  FOR UPDATE USING (is_commissioner_or_co(id));

-- Allow commissioners to delete members
DROP POLICY IF EXISTS league_members_delete_commissioner ON league_members;
CREATE POLICY league_members_delete_commissioner ON league_members
  FOR DELETE USING (is_commissioner_or_co(league_id));
