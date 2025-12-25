-- Migration: Add WITH CHECK clauses to RLS policies
-- This ensures data integrity on INSERT and UPDATE operations

-- Drop and recreate policies with WITH CHECK clauses

-- LEAGUE_MEMBERS: Ensure users can only insert for themselves
DROP POLICY IF EXISTS league_members_insert_self ON league_members;
CREATE POLICY league_members_insert_self ON league_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ROSTERS: Ensure users can only insert their own roster entries
DROP POLICY IF EXISTS rosters_insert_own ON rosters;
CREATE POLICY rosters_insert_own ON rosters
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    is_league_member(league_id)
  );

-- WEEKLY_PICKS: Ensure users can only insert their own picks
DROP POLICY IF EXISTS weekly_picks_insert_own ON weekly_picks;
CREATE POLICY weekly_picks_insert_own ON weekly_picks
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    is_league_member(league_id)
  );

-- WEEKLY_PICKS: Ensure users can only update their own pending picks
DROP POLICY IF EXISTS weekly_picks_update_own ON weekly_picks;
CREATE POLICY weekly_picks_update_own ON weekly_picks
  FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- WAIVER_RANKINGS: Ensure users can only insert their own rankings
DROP POLICY IF EXISTS waiver_rankings_insert_own ON waiver_rankings;
CREATE POLICY waiver_rankings_insert_own ON waiver_rankings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    is_league_member(league_id)
  );

-- WAIVER_RANKINGS: Ensure users can only update their own rankings
DROP POLICY IF EXISTS waiver_rankings_update_own ON waiver_rankings;
CREATE POLICY waiver_rankings_update_own ON waiver_rankings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- LEAGUES: Ensure commissioners can only update their own leagues
DROP POLICY IF EXISTS leagues_update_commissioner ON leagues;
CREATE POLICY leagues_update_commissioner ON leagues
  FOR UPDATE
  USING (commissioner_id = auth.uid())
  WITH CHECK (commissioner_id = auth.uid());

-- USERS: Ensure users can only update their own profile
DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- NOTIFICATIONS: Ensure users can only update their own notifications
DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
