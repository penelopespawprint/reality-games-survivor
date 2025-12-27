-- Atomic Payment Processing Function
-- Ensures league membership and payment record are inserted atomically
-- Prevents race conditions where payment succeeds but membership fails

CREATE OR REPLACE FUNCTION process_league_payment(
  p_user_id UUID,
  p_league_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_session_id TEXT,
  p_payment_intent_id TEXT
) RETURNS TABLE(membership_id UUID, payment_id UUID) AS $$
DECLARE
  v_membership_id UUID;
  v_payment_id UUID;
BEGIN
  -- Check if already a member (idempotency)
  SELECT id INTO v_membership_id
  FROM league_members
  WHERE league_id = p_league_id AND user_id = p_user_id;

  IF v_membership_id IS NULL THEN
    -- Add to league
    INSERT INTO league_members (league_id, user_id)
    VALUES (p_league_id, p_user_id)
    RETURNING id INTO v_membership_id;
  END IF;

  -- Record payment (will skip if duplicate session_id due to ON CONFLICT)
  INSERT INTO payments (
    user_id, league_id, amount, currency,
    stripe_session_id, stripe_payment_intent_id, status
  )
  VALUES (
    p_user_id, p_league_id, p_amount, p_currency,
    p_session_id, p_payment_intent_id, 'completed'
  )
  ON CONFLICT (stripe_session_id) DO NOTHING
  RETURNING id INTO v_payment_id;

  RETURN QUERY SELECT v_membership_id, v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint on stripe_session_id for idempotency
ALTER TABLE payments ADD CONSTRAINT unique_stripe_session_id UNIQUE (stripe_session_id);

-- Add unique constraint on league_members for idempotency
-- Only add if doesn't exist (check prevents error if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_league_user'
  ) THEN
    ALTER TABLE league_members ADD CONSTRAINT unique_league_user UNIQUE (league_id, user_id);
  END IF;
END $$;
