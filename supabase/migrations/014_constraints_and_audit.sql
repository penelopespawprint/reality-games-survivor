-- Migration: Add database constraints and audit logging table

-- ============================================
-- CONSTRAINTS
-- ============================================

-- Add CHECK constraint for max_players (2-24 range)
ALTER TABLE leagues
ADD CONSTRAINT leagues_max_players_range
CHECK (max_players >= 2 AND max_players <= 24);

-- Add CHECK constraint for donation_amount (0-10000 range)
ALTER TABLE leagues
ADD CONSTRAINT leagues_donation_amount_range
CHECK (donation_amount IS NULL OR (donation_amount >= 0 AND donation_amount <= 10000));

-- Add CHECK constraint for placement (1-24 range)
ALTER TABLE castaways
ADD CONSTRAINT castaways_placement_range
CHECK (placement IS NULL OR (placement >= 1 AND placement <= 24));

-- Add CHECK constraint for payment amount
ALTER TABLE payments
ADD CONSTRAINT payments_amount_positive
CHECK (amount >= 0);

-- ============================================
-- AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  user_id UUID REFERENCES users(id),
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role can insert audit logs
CREATE POLICY audit_logs_service_insert ON audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- AUDIT LOG FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_user_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (action, table_name, record_id, user_id, old_data, new_data, ip_address, user_agent)
  VALUES (p_action, p_table_name, p_record_id, p_user_id, p_old_data, p_new_data, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, UUID, UUID, JSONB, JSONB, TEXT, TEXT) TO service_role;

-- ============================================
-- TRIGGER FOR AUTOMATIC AUDIT ON SENSITIVE TABLES
-- ============================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_data JSONB := NULL;
  v_new_data JSONB := NULL;
  v_user_id UUID := NULL;
BEGIN
  -- Try to get user ID from the record or context
  v_user_id := COALESCE(
    (NEW).user_id,
    (NEW).commissioner_id,
    (OLD).user_id,
    (OLD).commissioner_id
  );

  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    INSERT INTO audit_logs (action, table_name, record_id, user_id, old_data)
    VALUES ('DELETE', TG_TABLE_NAME, (OLD).id, v_user_id, v_old_data);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    -- Only log if there are actual changes
    IF v_old_data != v_new_data THEN
      INSERT INTO audit_logs (action, table_name, record_id, user_id, old_data, new_data)
      VALUES ('UPDATE', TG_TABLE_NAME, (NEW).id, v_user_id, v_old_data, v_new_data);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_data := to_jsonb(NEW);
    INSERT INTO audit_logs (action, table_name, record_id, user_id, new_data)
    VALUES ('INSERT', TG_TABLE_NAME, (NEW).id, v_user_id, v_new_data);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_scoring_sessions
AFTER INSERT OR UPDATE ON scoring_sessions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Note: We don't add triggers to high-volume tables like weekly_picks or rosters
-- to avoid performance impact. Use explicit logging for those when needed.
