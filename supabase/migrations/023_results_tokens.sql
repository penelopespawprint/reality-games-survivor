-- Migration 023: Results Tokens for Secure Spoiler-Safe Viewing
-- Creates table for secure token-based results viewing and updates notifications table

CREATE TABLE results_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  UNIQUE(user_id, episode_id)
);

-- Enable RLS
ALTER TABLE results_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own results tokens"
  ON results_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_results_tokens_token ON results_tokens(token);
CREATE INDEX idx_results_tokens_user_episode ON results_tokens(user_id, episode_id);
CREATE INDEX idx_results_tokens_expires_at ON results_tokens(expires_at);

-- Add columns to notifications table for spoiler-safe scheduling
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS spoiler_safe BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Create index for scheduled notifications
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL AND sent_at IS NULL;
