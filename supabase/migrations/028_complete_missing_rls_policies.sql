-- ============================================
-- Migration 028: Complete Missing RLS Policies
-- ============================================
-- Adds missing INSERT policies and service role bypass for newer tables

-- ====================
-- NOTIFICATION_PREFERENCES
-- ====================
-- Users can insert their own preferences
CREATE POLICY notification_preferences_insert_own ON notification_preferences
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Service role bypass for system operations
CREATE POLICY notification_preferences_service ON notification_preferences
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Admin access for support and debugging
CREATE POLICY notification_preferences_admin ON notification_preferences
  FOR ALL USING (is_admin());

-- ====================
-- RESULTS_TOKENS
-- ====================
-- Service role bypass (backend creates tokens for users)
CREATE POLICY results_tokens_service ON results_tokens
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Admin access for debugging and support
CREATE POLICY results_tokens_admin ON results_tokens
  FOR ALL USING (is_admin());

-- Add comment explaining token security
COMMENT ON TABLE results_tokens IS
  'Secure tokens for spoiler-safe results viewing. Only service role can create tokens. Users can view own tokens.';
