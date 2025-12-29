-- Migration 052: Optimize RLS Performance
-- Wraps remaining auth.uid() and auth.role() calls in scalar subqueries (SELECT auth.uid())
-- This prevents per-row re-evaluation and improves query performance at scale.

BEGIN;

-- 1. USERS
DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- 2. NOTIFICATION PREFERENCES
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences" ON notification_preferences 
FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences" ON notification_preferences 
FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- 3. CHAT MESSAGES
DROP POLICY IF EXISTS league_messages_insert ON league_messages;
CREATE POLICY league_messages_insert ON league_messages 
FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid())) AND is_league_member(league_id));

DROP POLICY IF EXISTS league_messages_delete ON league_messages;
CREATE POLICY league_messages_delete ON league_messages 
FOR DELETE USING (user_id = (SELECT auth.uid()));

-- 4. RESULTS TOKENS
DROP POLICY IF EXISTS results_tokens_select_own ON results_tokens;
CREATE POLICY results_tokens_select_own ON results_tokens 
FOR SELECT USING (user_id = (SELECT auth.uid()));

-- 5. TRIVIA TRACKING
DROP POLICY IF EXISTS daily_trivia_tracking_insert_own ON daily_trivia_tracking;
CREATE POLICY daily_trivia_tracking_insert_own ON daily_trivia_tracking 
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS daily_trivia_tracking_select_own ON daily_trivia_tracking;
CREATE POLICY daily_trivia_tracking_select_own ON daily_trivia_tracking 
FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- 6. DRAFT RANKINGS
DROP POLICY IF EXISTS draft_rankings_select_own ON draft_rankings;
CREATE POLICY draft_rankings_select_own ON draft_rankings 
FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS draft_rankings_insert_own ON draft_rankings;
CREATE POLICY draft_rankings_insert_own ON draft_rankings 
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS draft_rankings_update_own ON draft_rankings;
CREATE POLICY draft_rankings_update_own ON draft_rankings 
FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS draft_rankings_delete_own ON draft_rankings;
CREATE POLICY draft_rankings_delete_own ON draft_rankings 
FOR DELETE USING (user_id = (SELECT auth.uid()));

-- 7. ROLE UPDATE PROTECTION
DROP POLICY IF EXISTS users_prevent_self_role_update ON users;
CREATE POLICY users_prevent_self_role_update ON users
FOR UPDATE
USING (id = (SELECT auth.uid()))
WITH CHECK (
  id = (SELECT auth.uid()) AND
  (
    role = (SELECT role FROM users WHERE id = (SELECT auth.uid())) 
    OR (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
  )
);

COMMIT;
