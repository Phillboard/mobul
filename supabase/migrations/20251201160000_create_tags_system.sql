-- Tags System Migration
-- Provides flexible tagging for campaigns, contacts, and other entities

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1', -- Default indigo color
  description TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'contact', 'list', 'form', 'template')),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  is_system BOOLEAN DEFAULT FALSE, -- System tags can't be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Unique tag names per client and entity type
  UNIQUE(name, entity_type, client_id)
);

-- Tag assignments (junction table)
CREATE TABLE IF NOT EXISTS tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL, -- The ID of the tagged entity
  entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'contact', 'list', 'form', 'template')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  
  -- Prevent duplicate assignments
  UNIQUE(tag_id, entity_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_client_type ON tags(client_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_entity ON tag_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag ON tag_assignments(tag_id);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
CREATE POLICY "Users can view tags for their clients"
  ON tags FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'tech_support')
    )
  );

CREATE POLICY "Users can create tags for their clients"
  ON tags FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'agency_owner')
    )
  );

CREATE POLICY "Users can update their client tags"
  ON tags FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'agency_owner')
    )
  );

CREATE POLICY "Users can delete non-system tags"
  ON tags FOR DELETE
  USING (
    is_system = FALSE
    AND (
      client_id IN (
        SELECT client_id FROM user_roles 
        WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'agency_owner')
      )
    )
  );

-- RLS Policies for tag_assignments
CREATE POLICY "Users can view tag assignments for their clients"
  ON tag_assignments FOR SELECT
  USING (
    tag_id IN (
      SELECT id FROM tags 
      WHERE client_id IN (
        SELECT client_id FROM user_roles 
        WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'tech_support')
    )
  );

CREATE POLICY "Users can manage tag assignments"
  ON tag_assignments FOR ALL
  USING (
    tag_id IN (
      SELECT id FROM tags 
      WHERE client_id IN (
        SELECT client_id FROM user_roles 
        WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'agency_owner')
    )
  );

-- Function to get tags for an entity
CREATE OR REPLACE FUNCTION get_entity_tags(
  p_entity_id UUID,
  p_entity_type TEXT
)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  tag_color TEXT,
  assigned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS tag_id,
    t.name AS tag_name,
    t.color AS tag_color,
    ta.assigned_at
  FROM tag_assignments ta
  JOIN tags t ON t.id = ta.tag_id
  WHERE ta.entity_id = p_entity_id
    AND ta.entity_type = p_entity_type
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign a tag to an entity
CREATE OR REPLACE FUNCTION assign_tag(
  p_tag_id UUID,
  p_entity_id UUID,
  p_entity_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  INSERT INTO tag_assignments (tag_id, entity_id, entity_type, assigned_by)
  VALUES (p_tag_id, p_entity_id, p_entity_type, auth.uid())
  ON CONFLICT (tag_id, entity_id) DO NOTHING
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a tag from an entity
CREATE OR REPLACE FUNCTION remove_tag(
  p_tag_id UUID,
  p_entity_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM tag_assignments
  WHERE tag_id = p_tag_id AND entity_id = p_entity_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get entities by tag
CREATE OR REPLACE FUNCTION get_entities_by_tag(
  p_tag_id UUID,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  entity_id UUID,
  entity_type TEXT,
  assigned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.entity_id,
    ta.entity_type,
    ta.assigned_at
  FROM tag_assignments ta
  WHERE ta.tag_id = p_tag_id
    AND (p_entity_type IS NULL OR ta.entity_type = p_entity_type)
  ORDER BY ta.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_entity_tags TO authenticated;
GRANT EXECUTE ON FUNCTION assign_tag TO authenticated;
GRANT EXECUTE ON FUNCTION remove_tag TO authenticated;
GRANT EXECUTE ON FUNCTION get_entities_by_tag TO authenticated;

COMMENT ON TABLE tags IS 'Flexible tagging system for organizing entities';
COMMENT ON TABLE tag_assignments IS 'Junction table linking tags to entities';
COMMENT ON FUNCTION get_entity_tags IS 'Get all tags assigned to an entity';
COMMENT ON FUNCTION assign_tag IS 'Assign a tag to an entity';
COMMENT ON FUNCTION remove_tag IS 'Remove a tag from an entity';

