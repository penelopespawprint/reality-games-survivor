-- ============================================
-- SOCIAL MEDIA POSTS TABLE
-- Tracks posts created through our CMS
-- ============================================
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buffer_id TEXT, -- Buffer's update ID
  profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  text TEXT NOT NULL,
  media JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for social posts
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_buffer ON social_posts(buffer_id) WHERE buffer_id IS NOT NULL;

-- ============================================
-- SOCIAL MEDIA TEMPLATES TABLE
-- Reusable post templates
-- ============================================
CREATE TABLE IF NOT EXISTS social_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  text TEXT NOT NULL,
  media JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for templates
CREATE INDEX idx_social_templates_category ON social_templates(category);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_templates ENABLE ROW LEVEL SECURITY;

-- Admin-only access for social posts
CREATE POLICY social_posts_admin_all ON social_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin-only access for templates
CREATE POLICY social_templates_admin_all ON social_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role access
CREATE POLICY social_posts_service_all ON social_posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY social_templates_service_all ON social_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
