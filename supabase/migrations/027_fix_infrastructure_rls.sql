-- ============================================
-- Migration 027: Fix Infrastructure Table RLS
-- ============================================
-- CRITICAL: email_queue, failed_emails, and cron_job_logs had NO RLS protection
-- This exposed sensitive email data and system logs to all authenticated users

-- Enable RLS on infrastructure tables
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Helper function already exists from migration 002
-- is_admin() checks: SELECT EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'admin')

-- ====================
-- EMAIL_QUEUE policies
-- ====================
-- Only service role can perform all operations
CREATE POLICY email_queue_service_only ON email_queue
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Admins can read for debugging (but not modify queue)
CREATE POLICY email_queue_admin_read ON email_queue
  FOR SELECT USING (is_admin());

-- ====================
-- FAILED_EMAILS policies
-- ====================
-- Only service role can perform all operations
CREATE POLICY failed_emails_service_only ON failed_emails
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Admins can read for debugging and retry management
CREATE POLICY failed_emails_admin_read ON failed_emails
  FOR SELECT USING (is_admin());

-- ====================
-- CRON_JOB_LOGS policies
-- ====================
-- Service role and admins can do everything
CREATE POLICY cron_job_logs_service_admin ON cron_job_logs
  FOR ALL USING ((SELECT auth.role()) = 'service_role' OR is_admin());

-- Add comment explaining the security model
COMMENT ON TABLE email_queue IS
  'Email queue with retry logic. RLS restricts access to service role and admin only to protect sensitive email content.';

COMMENT ON TABLE failed_emails IS
  'Dead letter queue for failed emails. RLS restricts access to service role and admin only.';

COMMENT ON TABLE cron_job_logs IS
  'Scheduled job execution logs. RLS restricts access to service role and admin only to prevent system reconnaissance.';
