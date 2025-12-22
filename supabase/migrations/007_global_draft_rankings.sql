-- Global Draft Rankings table
-- Users set one ranking for all their leagues per season

CREATE TABLE IF NOT EXISTS draft_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  rankings JSONB NOT NULL, -- Array of castaway IDs in ranked order
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

CREATE INDEX idx_draft_rankings_user_season ON draft_rankings(user_id, season_id);

-- RLS Policies
ALTER TABLE draft_rankings ENABLE ROW LEVEL SECURITY;

-- Users can see and manage their own rankings
CREATE POLICY draft_rankings_select_own ON draft_rankings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY draft_rankings_insert_own ON draft_rankings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY draft_rankings_update_own ON draft_rankings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY draft_rankings_delete_own ON draft_rankings FOR DELETE USING (user_id = auth.uid());

-- Admins can view all
CREATE POLICY draft_rankings_admin ON draft_rankings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Service role bypass
CREATE POLICY service_bypass_draft_rankings ON draft_rankings FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE TRIGGER update_draft_rankings_updated_at BEFORE UPDATE ON draft_rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
