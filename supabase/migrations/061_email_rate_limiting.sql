-- Email Rate Limiting
-- Track lifecycle emails sent to prevent spam (max 2 non-transactional per week)

-- Table to track lifecycle (non-transactional) emails sent
CREATE TABLE IF NOT EXISTS lifecycle_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type VARCHAR(100) NOT NULL, -- e.g., 'join-league-nudge', 'pre-season-hype'
  sent_at TIMESTAMPTZ DEFAULT now(),
  
  -- Index for quick lookups
  CONSTRAINT lifecycle_email_log_user_type_time UNIQUE (user_id, email_type, sent_at)
);

-- Index for rate limit queries (emails per user in last 7 days)
CREATE INDEX IF NOT EXISTS idx_lifecycle_email_log_user_recent 
ON lifecycle_email_log(user_id, sent_at DESC);

-- Index for checking if specific email type was sent recently
CREATE INDEX IF NOT EXISTS idx_lifecycle_email_log_user_type 
ON lifecycle_email_log(user_id, email_type, sent_at DESC);

-- RLS - service role only
ALTER TABLE lifecycle_email_log ENABLE ROW LEVEL SECURITY;

-- Function to check if user can receive a lifecycle email
-- Returns true if they've received fewer than max_per_week lifecycle emails this week
CREATE OR REPLACE FUNCTION can_send_lifecycle_email(
  p_user_id UUID,
  p_email_type VARCHAR(100),
  p_max_per_week INTEGER DEFAULT 2
)
RETURNS BOOLEAN AS $$
DECLARE
  emails_this_week INTEGER;
  same_type_recent BOOLEAN;
BEGIN
  -- Count lifecycle emails sent to this user in the last 7 days
  SELECT COUNT(*) INTO emails_this_week
  FROM lifecycle_email_log
  WHERE user_id = p_user_id
    AND sent_at > NOW() - INTERVAL '7 days';
  
  -- Check if this specific email type was sent in the last 3 days
  SELECT EXISTS(
    SELECT 1 FROM lifecycle_email_log
    WHERE user_id = p_user_id
      AND email_type = p_email_type
      AND sent_at > NOW() - INTERVAL '3 days'
  ) INTO same_type_recent;
  
  -- Can send if:
  -- 1. Under weekly limit AND
  -- 2. Same type wasn't sent in last 3 days
  RETURN emails_this_week < p_max_per_week AND NOT same_type_recent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log a lifecycle email send
CREATE OR REPLACE FUNCTION log_lifecycle_email(
  p_user_id UUID,
  p_email_type VARCHAR(100)
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO lifecycle_email_log (user_id, email_type)
  VALUES (p_user_id, p_email_type);
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old records (keep 30 days of history)
CREATE OR REPLACE FUNCTION cleanup_old_lifecycle_emails()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM lifecycle_email_log
  WHERE sent_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
