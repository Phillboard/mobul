-- ============================================================================
-- AI Landing Page Designer Enhancements
-- 
-- Adds columns to support the new AI-first code generation designer:
-- - generated_html: Stores the AI-generated HTML
-- - versions: JSONB array of version history
-- - current_version: Current version number
-- - ai_provider: Which AI provider was used
-- - total_tokens_used: Token usage tracking
-- ============================================================================

-- Add new columns to landing_pages table
ALTER TABLE landing_pages 
  ADD COLUMN IF NOT EXISTS generated_html TEXT,
  ADD COLUMN IF NOT EXISTS versions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(20) DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0;

-- Add index for editor_type to support filtering between visual and AI designers
CREATE INDEX IF NOT EXISTS idx_landing_pages_editor_type 
  ON landing_pages(editor_type);

-- Add index for finding pages by token usage (for analytics)
CREATE INDEX IF NOT EXISTS idx_landing_pages_tokens 
  ON landing_pages(total_tokens_used);

-- ============================================================================
-- Function to increment token usage
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_landing_page_tokens(
  page_id UUID,
  tokens_used INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE landing_pages
  SET 
    total_tokens_used = COALESCE(total_tokens_used, 0) + tokens_used,
    updated_at = NOW()
  WHERE id = page_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_landing_page_tokens(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- Function to add a new version
-- ============================================================================

CREATE OR REPLACE FUNCTION add_landing_page_version(
  page_id UUID,
  version_html TEXT,
  change_description TEXT,
  tokens_used INTEGER DEFAULT 0,
  is_manual_edit BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_version INTEGER;
  version_obj JSONB;
BEGIN
  -- Get next version number
  SELECT COALESCE(current_version, 0) + 1 INTO new_version
  FROM landing_pages
  WHERE id = page_id;

  -- Create version object
  version_obj := jsonb_build_object(
    'version', new_version,
    'html', version_html,
    'timestamp', NOW()::TEXT,
    'changeDescription', change_description,
    'tokensUsed', tokens_used,
    'isManualEdit', is_manual_edit
  );

  -- Update landing page with new version
  UPDATE landing_pages
  SET 
    versions = COALESCE(versions, '[]'::jsonb) || version_obj,
    current_version = new_version,
    generated_html = version_html,
    total_tokens_used = COALESCE(total_tokens_used, 0) + tokens_used,
    updated_at = NOW()
  WHERE id = page_id;

  RETURN new_version;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_landing_page_version(UUID, TEXT, TEXT, INTEGER, BOOLEAN) TO authenticated;

-- ============================================================================
-- Function to restore a version
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_landing_page_version(
  page_id UUID,
  version_number INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  version_html TEXT;
  version_obj JSONB;
BEGIN
  -- Find the version in the versions array
  SELECT v INTO version_obj
  FROM landing_pages lp,
       LATERAL jsonb_array_elements(lp.versions) AS v
  WHERE lp.id = page_id
    AND (v->>'version')::INTEGER = version_number;

  IF version_obj IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extract HTML from version
  version_html := version_obj->>'html';

  -- Update the current state
  UPDATE landing_pages
  SET 
    generated_html = version_html,
    current_version = version_number,
    updated_at = NOW()
  WHERE id = page_id;

  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION restore_landing_page_version(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN landing_pages.generated_html IS 'AI-generated HTML content for code-gen editor mode';
COMMENT ON COLUMN landing_pages.versions IS 'Version history array for AI designer';
COMMENT ON COLUMN landing_pages.current_version IS 'Current active version number';
COMMENT ON COLUMN landing_pages.ai_provider IS 'AI provider used (openai/anthropic)';
COMMENT ON COLUMN landing_pages.total_tokens_used IS 'Total AI tokens consumed';
