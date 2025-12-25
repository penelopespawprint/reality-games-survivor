-- Verification codes table for phone verification
-- Replaces in-memory storage for production scalability

CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  UNIQUE(user_id)  -- Only one pending code per user
);

CREATE INDEX idx_verification_codes_user ON verification_codes(user_id);
CREATE INDEX idx_verification_codes_expires ON verification_codes(expires_at);

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Users cannot read their own codes (security - prevents code exposure)
-- All operations go through service role (backend)
CREATE POLICY verification_codes_service ON verification_codes
  FOR ALL USING (auth.role() = 'service_role');

-- Cleanup job: delete expired codes older than 1 hour
-- This can be run periodically via pg_cron
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup every hour (if pg_cron is enabled)
-- SELECT cron.schedule('cleanup-verification-codes', '0 * * * *', 'SELECT cleanup_expired_verification_codes()');
