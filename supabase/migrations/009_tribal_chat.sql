-- ============================================
-- TRIBAL COUNCIL CHAT
-- Real-time chat for leagues and global standings
-- ============================================

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,  -- NULL = global chat
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,

  -- Reactions stored as JSONB: {"fire": ["user_id1", "user_id2"], "snake": ["user_id3"]}
  reactions JSONB DEFAULT '{}'::jsonb,

  -- Reply threading
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- Anonymous "Voting Booth" mode
  is_anonymous BOOLEAN DEFAULT FALSE,

  -- GIF/media support
  gif_url TEXT,

  -- Mentions stored as array of user IDs
  mentions UUID[] DEFAULT '{}',

  -- Pinned messages (commissioner/admin only)
  is_pinned BOOLEAN DEFAULT FALSE,
  pinned_by UUID REFERENCES users(id),
  pinned_at TIMESTAMPTZ,

  -- Soft delete for moderation
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_league ON chat_messages(league_id, created_at DESC)
  WHERE is_deleted = FALSE;
CREATE INDEX idx_chat_messages_global ON chat_messages(created_at DESC)
  WHERE league_id IS NULL AND is_deleted = FALSE;
CREATE INDEX idx_chat_messages_replies ON chat_messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_chat_messages_pinned ON chat_messages(league_id, is_pinned)
  WHERE is_pinned = TRUE;
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id, created_at DESC);

-- ============================================
-- CHAT PRESENCE (for "torch lit" online status)
-- ============================================
CREATE TABLE chat_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,  -- NULL = global chat
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, league_id)
);

CREATE INDEX idx_chat_presence_league ON chat_presence(league_id, last_seen_at DESC);
CREATE INDEX idx_chat_presence_global ON chat_presence(last_seen_at DESC)
  WHERE league_id IS NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;

-- CHAT MESSAGES POLICIES

-- Select: Can read global chat (all authenticated) or league chat (members only)
CREATE POLICY chat_messages_select ON chat_messages FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    league_id IS NULL  -- global chat, any authenticated user
    OR is_league_member(league_id)  -- league chat, members only
  )
);

-- Insert: Can post to global chat (authenticated) or league chat (members only)
CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT WITH CHECK (
  user_id = auth.uid() AND (
    league_id IS NULL  -- global chat
    OR is_league_member(league_id)  -- must be member to post in league
  )
);

-- Update: Can update own message (for reactions), or admin/commissioner can update for moderation
CREATE POLICY chat_messages_update ON chat_messages FOR UPDATE USING (
  user_id = auth.uid()  -- own message
  OR is_admin()  -- admin can moderate any
  OR (league_id IS NOT NULL AND is_commissioner(league_id))  -- commissioner can moderate league
);

-- Delete: Soft delete only, same rules as update
CREATE POLICY chat_messages_delete ON chat_messages FOR DELETE USING (
  is_admin()  -- only admin can hard delete
);

-- CHAT PRESENCE POLICIES

-- Select: Can see presence in chats you have access to
CREATE POLICY chat_presence_select ON chat_presence FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    league_id IS NULL
    OR is_league_member(league_id)
  )
);

-- Insert/Update: Can only manage your own presence
CREATE POLICY chat_presence_upsert ON chat_presence FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY chat_presence_update ON chat_presence FOR UPDATE USING (
  user_id = auth.uid()
);

CREATE POLICY chat_presence_delete ON chat_presence FOR DELETE USING (
  user_id = auth.uid()
);

-- Service role bypass
CREATE POLICY chat_messages_service ON chat_messages FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY chat_presence_service ON chat_presence FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to add a reaction to a message
CREATE OR REPLACE FUNCTION add_chat_reaction(
  p_message_id UUID,
  p_reaction_type TEXT  -- 'fire', 'snake', 'vote', 'blindside'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_reactions JSONB;
  v_reaction_users UUID[];
BEGIN
  -- Get current reactions
  SELECT reactions INTO v_current_reactions
  FROM chat_messages
  WHERE id = p_message_id;

  -- Get current users for this reaction type
  v_reaction_users := ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(v_current_reactions->p_reaction_type, '[]'::jsonb)
    )::UUID
  );

  -- Toggle: Add if not present, remove if present
  IF v_user_id = ANY(v_reaction_users) THEN
    -- Remove user from reaction
    v_reaction_users := array_remove(v_reaction_users, v_user_id);
  ELSE
    -- Add user to reaction
    v_reaction_users := array_append(v_reaction_users, v_user_id);
  END IF;

  -- Update the reactions JSONB
  UPDATE chat_messages
  SET reactions = jsonb_set(
    COALESCE(reactions, '{}'::jsonb),
    ARRAY[p_reaction_type],
    to_jsonb(v_reaction_users)
  )
  WHERE id = p_message_id
  RETURNING reactions INTO v_current_reactions;

  RETURN v_current_reactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update presence (heartbeat)
CREATE OR REPLACE FUNCTION update_chat_presence(
  p_league_id UUID DEFAULT NULL,
  p_is_typing BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
BEGIN
  INSERT INTO chat_presence (user_id, league_id, last_seen_at, is_typing)
  VALUES (auth.uid(), p_league_id, NOW(), p_is_typing)
  ON CONFLICT (user_id, league_id)
  DO UPDATE SET
    last_seen_at = NOW(),
    is_typing = p_is_typing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get online users (seen in last 2 minutes)
CREATE OR REPLACE FUNCTION get_online_users(p_league_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  is_typing BOOLEAN,
  last_seen_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.user_id,
    u.display_name,
    u.avatar_url,
    cp.is_typing,
    cp.last_seen_at
  FROM chat_presence cp
  JOIN users u ON u.id = cp.user_id
  WHERE
    (p_league_id IS NULL AND cp.league_id IS NULL)
    OR cp.league_id = p_league_id
  AND cp.last_seen_at > NOW() - INTERVAL '2 minutes'
  ORDER BY cp.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_presence;
