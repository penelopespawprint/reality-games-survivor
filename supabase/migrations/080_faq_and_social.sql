-- Migration 080: FAQ ordering and social media integration
-- Adds sort_order to site_copy for FAQ ordering
-- Creates social_posts table for Zapier/Buffer integration

-- ============================================
-- ADD SORT_ORDER TO SITE_COPY
-- ============================================

ALTER TABLE site_copy ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_site_copy_sort_order ON site_copy(page, sort_order);

-- ============================================
-- SOCIAL POSTS TABLE (for Zapier/Buffer)
-- ============================================

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Post content
  content TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, sent, failed

  -- Zapier webhook response
  webhook_response JSONB,

  -- Platforms (array of platforms to post to)
  platforms TEXT[] DEFAULT ARRAY['twitter', 'facebook', 'instagram'],

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_for) WHERE status = 'scheduled';

-- RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social posts"
  ON social_posts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DEFAULT FAQs INTO SITE_COPY
-- ============================================

INSERT INTO site_copy (key, page, section, content_type, content, description, sort_order) VALUES
('faq.how_do_i_join_a_league', 'faq', 'Getting Started', 'html',
 'You can join a league by browsing public leagues on the Leagues page, or by entering an invite code from a friend. If the league requires a donation, you''ll be redirected to complete payment before joining.',
 'How to join a league', 1),

('faq.how_does_the_draft_work', 'faq', 'Getting Started', 'html',
 'Each league holds a draft where players take turns selecting castaways. The draft order is randomized, and you can set your draft rankings ahead of time. If you miss your pick, the system will auto-draft based on your rankings.',
 'How the draft works', 2),

('faq.how_do_weekly_picks_work', 'faq', 'Gameplay', 'html',
 'Each week, you select one castaway from your roster to be your "active" pick. That castaway earns points for you based on their performance in the episode. Picks lock before each episode airs.',
 'How weekly picks work', 3),

('faq.how_is_scoring_calculated', 'faq', 'Gameplay', 'html',
 'Castaways earn points for various actions like winning challenges, finding idols, receiving confessionals, and surviving tribal council. Check the <a href="/how-to-play/scoring">Scoring Rules</a> page for the full breakdown.',
 'How scoring is calculated', 4),

('faq.what_happens_if_castaway_eliminated', 'faq', 'Gameplay', 'html',
 'If a castaway on your roster is eliminated, they remain on your roster but can no longer be selected as your weekly pick. You''ll need to choose from your remaining active castaways.',
 'What happens when castaway is eliminated', 5),

('faq.can_i_be_in_multiple_leagues', 'faq', 'Leagues', 'html',
 'Yes! You can join as many leagues as you want. Each league has its own draft, roster, and standings. Your performance in one league doesn''t affect your other leagues.',
 'Multiple leagues allowed', 6),

('faq.how_do_paid_leagues_work', 'faq', 'Leagues', 'html',
 'Some leagues require a donation to join. 100% of donations go to charity through our 501(c)(3) nonprofit partner. You''ll receive a tax receipt via email after your donation.',
 'How paid leagues work', 7),

('faq.how_do_i_create_my_own_league', 'faq', 'Leagues', 'html',
 'Click "Create League" on the Leagues page. You can set the league name, whether it''s public or private, and optionally require a donation. You''ll receive an invite code to share with friends.',
 'How to create a league', 8),

('faq.when_are_scores_updated', 'faq', 'Scoring', 'html',
 'Scores are typically updated within 24 hours after each episode airs. You''ll receive a notification when scores are finalized and standings are updated.',
 'When scores are updated', 9),

('faq.what_is_the_global_leaderboard', 'faq', 'Scoring', 'html',
 'The global leaderboard ranks all players across all leagues based on a weighted scoring system. It accounts for the number of leagues you''re in and your average performance.',
 'What is global leaderboard', 10),

('faq.how_do_i_contact_support', 'faq', 'Support', 'html',
 'You can reach us through the <a href="/contact">Contact</a> page. We typically respond within 24-48 hours. For urgent issues, include "URGENT" in your subject line.',
 'How to contact support', 11),

('faq.can_i_change_my_pick', 'faq', 'Gameplay', 'html',
 'Yes, you can change your pick as many times as you want until picks lock. Once locked (typically before the episode airs), picks cannot be changed.',
 'Can you change picks', 12)

ON CONFLICT (key) DO NOTHING;
