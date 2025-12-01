-- Comments System Migration
-- Provides a universal comments/notes system for entities

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'contact', 'form', 'task', 'list')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- Array of mentioned user IDs
  is_internal BOOLEAN DEFAULT TRUE, -- Internal notes vs customer-visible
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_mentions ON comments USING GIN (mentions);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view comments for their entities"
  ON comments FOR SELECT
  USING (
    -- User created the comment
    user_id = auth.uid()
    OR
    -- User has access to the entity (via client membership)
    EXISTS (
      SELECT 1 FROM client_users 
      WHERE user_id = auth.uid()
    )
    OR
    -- Admin/tech support can see all
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'tech_support')
    )
  );

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM client_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_timestamp();

-- Function to get comment count for an entity
CREATE OR REPLACE FUNCTION get_comment_count(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM comments 
    WHERE entity_type = p_entity_type 
    AND entity_id = p_entity_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent comments for a user (notifications)
CREATE OR REPLACE FUNCTION get_mentioned_comments(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  comment_id UUID,
  entity_type TEXT,
  entity_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  author_name TEXT,
  author_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS comment_id,
    c.entity_type,
    c.entity_id,
    c.content,
    c.created_at,
    p.full_name AS author_name,
    p.email AS author_email
  FROM comments c
  JOIN profiles p ON p.id = c.user_id
  WHERE p_user_id = ANY(c.mentions)
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_comment_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentioned_comments TO authenticated;

COMMENT ON TABLE comments IS 'Universal comments/notes system for entities';
COMMENT ON FUNCTION get_comment_count IS 'Get total comment count for an entity';
COMMENT ON FUNCTION get_mentioned_comments IS 'Get comments where user was mentioned';

