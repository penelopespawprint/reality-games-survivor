-- Optimize pending payment lookups for Stripe checkout flow
-- Index on (user_id, league_id, status) for fast pending payment checks

CREATE INDEX IF NOT EXISTS idx_payments_user_league_status
ON payments(user_id, league_id, status)
WHERE status = 'pending';

-- Index on stripe_session_id for fast session lookups
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session
ON payments(stripe_session_id);
