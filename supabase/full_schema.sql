-- RGFL Survivor - Full Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qxrgejdfxcvsfktgysop/sql/new

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('player', 'commissioner', 'admin');
CREATE TYPE league_status AS ENUM ('forming', 'drafting', 'active', 'completed');
CREATE TYPE draft_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE pick_status AS ENUM ('pending', 'locked', 'auto_picked');
CREATE TYPE waiver_status AS ENUM ('open', 'closed', 'processing');
CREATE TYPE scoring_session_status AS ENUM ('draft', 'finalized');
CREATE TYPE notification_type AS ENUM ('email', 'sms', 'push');
CREATE TYPE castaway_status AS ENUM ('active', 'eliminated', 'winner');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'refunded', 'failed');

-- ============================================
-- 1. USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  role user_role DEFAULT 'player',
  notification_email BOOLEAN DEFAULT TRUE,
  notification_sms BOOLEAN DEFAULT FALSE,
  notification_push BOOLEAN DEFAULT TRUE,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- ============================================
-- 2. SEASONS
-- ============================================
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  registration_opens_at TIMESTAMPTZ NOT NULL,
  draft_order_deadline TIMESTAMPTZ NOT NULL,
  registration_closes_at TIMESTAMPTZ NOT NULL,
  premiere_at TIMESTAMPTZ NOT NULL,
  draft_deadline TIMESTAMPTZ NOT NULL,
  finale_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. EPISODES
-- ============================================
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT,
  air_date TIMESTAMPTZ NOT NULL,
  picks_lock_at TIMESTAMPTZ NOT NULL,
  results_posted_at TIMESTAMPTZ,
  waiver_opens_at TIMESTAMPTZ,
  waiver_closes_at TIMESTAMPTZ,
  is_finale BOOLEAN DEFAULT FALSE,
  is_scored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, number)
);

CREATE INDEX idx_episodes_season ON episodes(season_id);
CREATE INDEX idx_episodes_air_date ON episodes(air_date);

-- ============================================
-- 4. CASTAWAYS
-- ============================================
CREATE TABLE castaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  hometown TEXT,
  occupation TEXT,
  photo_url TEXT,
  tribe_original TEXT,
  status castaway_status DEFAULT 'active',
  eliminated_episode_id UUID REFERENCES episodes(id),
  placement INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, name)
);

CREATE INDEX idx_castaways_season ON castaways(season_id);
CREATE INDEX idx_castaways_status ON castaways(status);

-- ============================================
-- 5. SCORING RULES
-- ============================================
CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  category TEXT,
  is_negative BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, code)
);

-- ============================================
-- 6. LEAGUES
-- ============================================
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  commissioner_id UUID NOT NULL REFERENCES users(id),
  max_players INTEGER DEFAULT 12,
  is_global BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  require_donation BOOLEAN DEFAULT FALSE,
  donation_amount DECIMAL(10,2),
  donation_notes TEXT,
  payout_method TEXT,
  status league_status DEFAULT 'forming',
  draft_status draft_status DEFAULT 'pending',
  draft_order JSONB,
  draft_started_at TIMESTAMPTZ,
  draft_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leagues_season ON leagues(season_id);
CREATE INDEX idx_leagues_code ON leagues(code);
CREATE INDEX idx_leagues_commissioner ON leagues(commissioner_id);
CREATE INDEX idx_leagues_global ON leagues(is_global) WHERE is_global = true;

-- ============================================
-- 7. LEAGUE MEMBERS
-- ============================================
CREATE TABLE league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_position INTEGER,
  total_points INTEGER DEFAULT 0,
  rank INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

CREATE INDEX idx_league_members_user ON league_members(user_id);
CREATE INDEX idx_league_members_league ON league_members(league_id);
CREATE INDEX idx_league_members_rank ON league_members(league_id, rank);

-- ============================================
-- 8. ROSTERS (2 castaways per player)
-- ============================================
CREATE TABLE rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  castaway_id UUID NOT NULL REFERENCES castaways(id) ON DELETE CASCADE,
  draft_round INTEGER NOT NULL,
  draft_pick INTEGER NOT NULL,
  acquired_via TEXT DEFAULT 'draft',
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  dropped_at TIMESTAMPTZ,
  UNIQUE(league_id, user_id, castaway_id)
);

CREATE INDEX idx_rosters_league_user ON rosters(league_id, user_id);
CREATE INDEX idx_rosters_castaway ON rosters(castaway_id);

-- ============================================
-- 9. WEEKLY PICKS
-- ============================================
CREATE TABLE weekly_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  castaway_id UUID REFERENCES castaways(id),
  status pick_status DEFAULT 'pending',
  points_earned INTEGER DEFAULT 0,
  picked_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id, episode_id)
);

CREATE INDEX idx_weekly_picks_episode ON weekly_picks(episode_id);
CREATE INDEX idx_weekly_picks_user ON weekly_picks(user_id);
CREATE INDEX idx_weekly_picks_league_episode ON weekly_picks(league_id, episode_id);

-- ============================================
-- 10. WAIVER RANKINGS
-- ============================================
CREATE TABLE waiver_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  rankings JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id, episode_id)
);

-- ============================================
-- 11. WAIVER RESULTS
-- ============================================
CREATE TABLE waiver_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  dropped_castaway_id UUID REFERENCES castaways(id),
  acquired_castaway_id UUID REFERENCES castaways(id),
  waiver_position INTEGER NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waiver_results_league_episode ON waiver_results(league_id, episode_id);

-- ============================================
-- 12. EPISODE SCORES
-- ============================================
CREATE TABLE episode_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  castaway_id UUID NOT NULL REFERENCES castaways(id) ON DELETE CASCADE,
  scoring_rule_id UUID NOT NULL REFERENCES scoring_rules(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  points INTEGER NOT NULL,
  notes TEXT,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(episode_id, castaway_id, scoring_rule_id)
);

CREATE INDEX idx_episode_scores_episode ON episode_scores(episode_id);
CREATE INDEX idx_episode_scores_castaway ON episode_scores(castaway_id);

-- ============================================
-- 13. SCORING SESSIONS
-- ============================================
CREATE TABLE scoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID UNIQUE NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  status scoring_session_status DEFAULT 'draft',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES users(id)
);

-- ============================================
-- 14. NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================
-- 15. SMS COMMANDS
-- ============================================
CREATE TABLE sms_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  command TEXT NOT NULL,
  raw_message TEXT NOT NULL,
  parsed_data JSONB,
  response_sent TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_commands_phone ON sms_commands(phone);
CREATE INDEX idx_sms_commands_user ON sms_commands(user_id);

-- ============================================
-- 16. PAYMENTS
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  league_id UUID NOT NULL REFERENCES leagues(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  status payment_status DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  refunded_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_league ON payments(league_id);
CREATE INDEX idx_payments_stripe_session ON payments(stripe_session_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_castaways_updated_at BEFORE UPDATE ON castaways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_scoring_rules_updated_at BEFORE UPDATE ON scoring_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_weekly_picks_updated_at BEFORE UPDATE ON weekly_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_waiver_rankings_updated_at BEFORE UPDATE ON waiver_rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- User sync: auth.users -> public.users + global league
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  global_league_id UUID;
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  SELECT id INTO global_league_id FROM public.leagues WHERE is_global = true LIMIT 1;
  IF global_league_id IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, user_id)
    VALUES (global_league_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate 6-char league invite code
CREATE OR REPLACE FUNCTION generate_league_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate league code on insert
CREATE OR REPLACE FUNCTION set_league_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_league_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_league_code_trigger
  BEFORE INSERT ON leagues
  FOR EACH ROW EXECUTE FUNCTION set_league_code();

-- ============================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE castaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_commissioner(league_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM leagues WHERE id = league_uuid AND commissioner_id = auth.uid())
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_league_member(league_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM league_members WHERE league_id = league_uuid AND user_id = auth.uid())
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- USERS policies
CREATE POLICY users_select_own ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_update_own ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY users_select_admin ON users FOR SELECT USING (is_admin());
CREATE POLICY users_update_admin ON users FOR UPDATE USING (is_admin());
CREATE POLICY users_select_league_mates ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM league_members lm1
    JOIN league_members lm2 ON lm1.league_id = lm2.league_id
    WHERE lm1.user_id = auth.uid() AND lm2.user_id = users.id
  )
);

-- PUBLIC READ tables
CREATE POLICY seasons_select_all ON seasons FOR SELECT USING (true);
CREATE POLICY seasons_admin ON seasons FOR ALL USING (is_admin());

CREATE POLICY episodes_select_all ON episodes FOR SELECT USING (true);
CREATE POLICY episodes_admin ON episodes FOR ALL USING (is_admin());

CREATE POLICY castaways_select_all ON castaways FOR SELECT USING (true);
CREATE POLICY castaways_admin ON castaways FOR ALL USING (is_admin());

CREATE POLICY scoring_rules_select_all ON scoring_rules FOR SELECT USING (true);
CREATE POLICY scoring_rules_admin ON scoring_rules FOR ALL USING (is_admin());

-- LEAGUES policies
CREATE POLICY leagues_select_public ON leagues FOR SELECT USING (is_public = true);
CREATE POLICY leagues_select_member ON leagues FOR SELECT USING (is_league_member(id));
CREATE POLICY leagues_select_commissioner ON leagues FOR SELECT USING (commissioner_id = auth.uid());
CREATE POLICY leagues_insert ON leagues FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND commissioner_id = auth.uid());
CREATE POLICY leagues_update_commissioner ON leagues FOR UPDATE USING (commissioner_id = auth.uid());
CREATE POLICY leagues_delete_commissioner ON leagues FOR DELETE USING (commissioner_id = auth.uid() AND draft_status = 'pending');
CREATE POLICY leagues_admin ON leagues FOR ALL USING (is_admin());

-- LEAGUE_MEMBERS policies
CREATE POLICY league_members_select_member ON league_members FOR SELECT USING (is_league_member(league_id));
CREATE POLICY league_members_select_public ON league_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND is_public = true)
);
CREATE POLICY league_members_insert_self ON league_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY league_members_delete_self ON league_members FOR DELETE USING (user_id = auth.uid());
CREATE POLICY league_members_admin ON league_members FOR ALL USING (is_admin());

-- ROSTERS policies
CREATE POLICY rosters_select_member ON rosters FOR SELECT USING (is_league_member(league_id));
CREATE POLICY rosters_select_public ON rosters FOR SELECT USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND is_public = true)
);
CREATE POLICY rosters_insert_own ON rosters FOR INSERT WITH CHECK (user_id = auth.uid() AND is_league_member(league_id));
CREATE POLICY rosters_update_own ON rosters FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY rosters_admin ON rosters FOR ALL USING (is_admin());

-- WEEKLY_PICKS policies
CREATE POLICY weekly_picks_select_own ON weekly_picks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY weekly_picks_select_locked ON weekly_picks FOR SELECT USING (
  is_league_member(league_id) AND status IN ('locked', 'auto_picked')
);
CREATE POLICY weekly_picks_select_public ON weekly_picks FOR SELECT USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND is_public = true)
  AND status IN ('locked', 'auto_picked')
);
CREATE POLICY weekly_picks_insert_own ON weekly_picks FOR INSERT WITH CHECK (user_id = auth.uid() AND is_league_member(league_id));
CREATE POLICY weekly_picks_update_own ON weekly_picks FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY weekly_picks_admin ON weekly_picks FOR ALL USING (is_admin());

-- WAIVER_RANKINGS policies
CREATE POLICY waiver_rankings_select_own ON waiver_rankings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY waiver_rankings_select_commissioner ON waiver_rankings FOR SELECT USING (is_commissioner(league_id));
CREATE POLICY waiver_rankings_insert_own ON waiver_rankings FOR INSERT WITH CHECK (user_id = auth.uid() AND is_league_member(league_id));
CREATE POLICY waiver_rankings_update_own ON waiver_rankings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY waiver_rankings_delete_own ON waiver_rankings FOR DELETE USING (user_id = auth.uid());
CREATE POLICY waiver_rankings_admin ON waiver_rankings FOR ALL USING (is_admin());

-- WAIVER_RESULTS policies
CREATE POLICY waiver_results_select_member ON waiver_results FOR SELECT USING (is_league_member(league_id));
CREATE POLICY waiver_results_select_public ON waiver_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND is_public = true)
);
CREATE POLICY waiver_results_admin ON waiver_results FOR ALL USING (is_admin());

-- EPISODE_SCORES policies
CREATE POLICY episode_scores_select_finalized ON episode_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM scoring_sessions WHERE episode_id = episode_scores.episode_id AND status = 'finalized')
);
CREATE POLICY episode_scores_admin ON episode_scores FOR ALL USING (is_admin());

-- SCORING_SESSIONS policies
CREATE POLICY scoring_sessions_select_finalized ON scoring_sessions FOR SELECT USING (status = 'finalized');
CREATE POLICY scoring_sessions_admin ON scoring_sessions FOR ALL USING (is_admin());

-- NOTIFICATIONS policies
CREATE POLICY notifications_select_own ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notifications_admin ON notifications FOR ALL USING (is_admin());

-- SMS_COMMANDS policies
CREATE POLICY sms_commands_select_own ON sms_commands FOR SELECT USING (user_id = auth.uid());
CREATE POLICY sms_commands_admin ON sms_commands FOR ALL USING (is_admin());

-- PAYMENTS policies
CREATE POLICY payments_select_own ON payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY payments_admin ON payments FOR ALL USING (is_admin());

-- SERVICE ROLE BYPASS (for backend operations)
CREATE POLICY service_bypass_users ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_league_members ON league_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_rosters ON rosters FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_weekly_picks ON weekly_picks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_waiver_rankings ON waiver_rankings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_waiver_results ON waiver_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_episode_scores ON episode_scores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_scoring_sessions ON scoring_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_notifications ON notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_sms_commands ON sms_commands FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY service_bypass_payments ON payments FOR ALL USING (auth.role() = 'service_role');
