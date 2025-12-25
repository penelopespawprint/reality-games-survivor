-- Migration: Move verification codes from memory to database
-- This fixes the critical issue of verification codes being lost on server restart

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  phone TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  UNIQUE(user_id)  -- Only one active code per user
);

-- Index for cleanup job
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);

-- Index for user lookup
CREATE INDEX idx_verification_codes_user_id ON verification_codes(user_id);

-- RLS policies
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own verification codes
CREATE POLICY verification_codes_select_own ON verification_codes
  FOR SELECT USING (user_id = auth.uid());

-- Only service role can insert/update/delete (backend operations)
CREATE POLICY verification_codes_service ON verification_codes
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up expired codes (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM verification_codes WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup every hour (if pg_cron is available)
-- SELECT cron.schedule('cleanup-verification-codes', '0 * * * *', 'SELECT cleanup_expired_verification_codes()');
