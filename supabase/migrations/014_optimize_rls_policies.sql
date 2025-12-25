-- ============================================
-- OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- ============================================
-- Wrap auth.uid() and auth.role() calls in scalar subqueries
-- to prevent per-row re-evaluation. This improves query performance
-- by allowing PostgreSQL to cache these values per query.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Drop and recreate helper functions with optimized auth calls
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'admin')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_commissioner(league_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM leagues WHERE id = league_uuid AND commissioner_id = (SELECT auth.uid()))
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_league_member(league_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM league_members WHERE league_id = league_uuid AND user_id = (SELECT auth.uid()))
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================
-- USERS policies (optimized)
-- ============================================
DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS users_select_league_mates ON users;

CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = (SELECT auth.uid()));

CREATE POLICY users_select_league_mates ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM league_members lm1
      JOIN league_members lm2 ON lm1.league_id = lm2.league_id
      WHERE lm1.user_id = (SELECT auth.uid()) AND lm2.user_id = users.id
    )
  );

-- ============================================
-- LEAGUES policies (optimized)
-- ============================================
DROP POLICY IF EXISTS leagues_select_commissioner ON leagues;
DROP POLICY IF EXISTS leagues_insert ON leagues;
DROP POLICY IF EXISTS leagues_update_commissioner ON leagues;
DROP POLICY IF EXISTS leagues_delete_commissioner ON leagues;

CREATE POLICY leagues_select_commissioner ON leagues
  FOR SELECT USING (commissioner_id = (SELECT auth.uid()));

CREATE POLICY leagues_insert ON leagues
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND commissioner_id = (SELECT auth.uid()));

CREATE POLICY leagues_update_commissioner ON leagues
  FOR UPDATE USING (commissioner_id = (SELECT auth.uid()));

CREATE POLICY leagues_delete_commissioner ON leagues
  FOR DELETE USING (commissioner_id = (SELECT auth.uid()) AND draft_status = 'pending');

-- ============================================
-- LEAGUE_MEMBERS policies (optimized)
-- ============================================
DROP POLICY IF EXISTS league_members_insert_self ON league_members;
DROP POLICY IF EXISTS league_members_delete_self ON league_members;

CREATE POLICY league_members_insert_self ON league_members
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY league_members_delete_self ON league_members
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================
-- ROSTERS policies (optimized)
-- ============================================
DROP POLICY IF EXISTS rosters_insert_own ON rosters;
DROP POLICY IF EXISTS rosters_update_own ON rosters;

CREATE POLICY rosters_insert_own ON rosters
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) AND is_league_member(league_id));

CREATE POLICY rosters_update_own ON rosters
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- ============================================
-- WEEKLY_PICKS policies (optimized)
-- ============================================
DROP POLICY IF EXISTS weekly_picks_select_own ON weekly_picks;
DROP POLICY IF EXISTS weekly_picks_insert_own ON weekly_picks;
DROP POLICY IF EXISTS weekly_picks_update_own ON weekly_picks;

CREATE POLICY weekly_picks_select_own ON weekly_picks
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY weekly_picks_insert_own ON weekly_picks
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) AND is_league_member(league_id));

CREATE POLICY weekly_picks_update_own ON weekly_picks
  FOR UPDATE USING (user_id = (SELECT auth.uid()) AND status = 'pending');

-- ============================================
-- WAIVER_RANKINGS policies (optimized)
-- ============================================
DROP POLICY IF EXISTS waiver_rankings_select_own ON waiver_rankings;
DROP POLICY IF EXISTS waiver_rankings_insert_own ON waiver_rankings;
DROP POLICY IF EXISTS waiver_rankings_update_own ON waiver_rankings;
DROP POLICY IF EXISTS waiver_rankings_delete_own ON waiver_rankings;

CREATE POLICY waiver_rankings_select_own ON waiver_rankings
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY waiver_rankings_insert_own ON waiver_rankings
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) AND is_league_member(league_id));

CREATE POLICY waiver_rankings_update_own ON waiver_rankings
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY waiver_rankings_delete_own ON waiver_rankings
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================
-- NOTIFICATIONS policies (optimized)
-- ============================================
DROP POLICY IF EXISTS notifications_select_own ON notifications;
DROP POLICY IF EXISTS notifications_update_own ON notifications;

CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- ============================================
-- SMS_COMMANDS policies (optimized)
-- ============================================
DROP POLICY IF EXISTS sms_commands_select_own ON sms_commands;

CREATE POLICY sms_commands_select_own ON sms_commands
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- ============================================
-- PAYMENTS policies (optimized)
-- ============================================
DROP POLICY IF EXISTS payments_select_own ON payments;

CREATE POLICY payments_select_own ON payments
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- ============================================
-- SERVICE ROLE BYPASS policies (optimized)
-- ============================================
DROP POLICY IF EXISTS service_bypass_users ON users;
DROP POLICY IF EXISTS service_bypass_league_members ON league_members;
DROP POLICY IF EXISTS service_bypass_rosters ON rosters;
DROP POLICY IF EXISTS service_bypass_weekly_picks ON weekly_picks;
DROP POLICY IF EXISTS service_bypass_waiver_rankings ON waiver_rankings;
DROP POLICY IF EXISTS service_bypass_waiver_results ON waiver_results;
DROP POLICY IF EXISTS service_bypass_episode_scores ON episode_scores;
DROP POLICY IF EXISTS service_bypass_scoring_sessions ON scoring_sessions;
DROP POLICY IF EXISTS service_bypass_notifications ON notifications;
DROP POLICY IF EXISTS service_bypass_sms_commands ON sms_commands;
DROP POLICY IF EXISTS service_bypass_payments ON payments;

CREATE POLICY service_bypass_users ON users
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_league_members ON league_members
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_rosters ON rosters
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_weekly_picks ON weekly_picks
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_waiver_rankings ON waiver_rankings
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_waiver_results ON waiver_results
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_episode_scores ON episode_scores
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_scoring_sessions ON scoring_sessions
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_notifications ON notifications
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_sms_commands ON sms_commands
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY service_bypass_payments ON payments
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================
-- Add recommended indexes for RLS performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_league_members_user_id ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league_user ON league_members(league_id, user_id);
CREATE INDEX IF NOT EXISTS idx_rosters_user_id ON rosters(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_picks_user_id ON weekly_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
