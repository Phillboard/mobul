-- AI Landing Page System Migration
-- This migration extends the landing_pages system with AI capabilities

-- ============================================================================
-- 1. Extend landing_pages table with AI fields
-- ============================================================================

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS source_type TEXT 
  CHECK (source_type IN ('text_prompt', 'image_upload', 'link_analysis', 'manual'))
  DEFAULT 'manual';

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS source_data JSONB DEFAULT '{}';
COMMENT ON COLUMN landing_pages.source_data IS 'Stores original prompt, image URL, or analyzed link data';

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS ai_provider TEXT 
  CHECK (ai_provider IN ('openai', 'anthropic', 'manual'))
  DEFAULT 'manual';

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS ai_model TEXT;
COMMENT ON COLUMN landing_pages.ai_model IS 'e.g., gpt-4-vision-preview, claude-3-opus-20240229';

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS generation_tokens INTEGER DEFAULT 0;
COMMENT ON COLUMN landing_pages.generation_tokens IS 'Track AI usage for billing/analytics';

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS visual_editor_state JSONB DEFAULT '{}';
COMMENT ON COLUMN landing_pages.visual_editor_state IS 'Custom editor state (not GrapeJS) for visual editing';

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS export_formats TEXT[] DEFAULT '{}';
COMMENT ON COLUMN landing_pages.export_formats IS 'Formats user has exported to: static, react, wordpress, hosted';

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS custom_domain TEXT;
COMMENT ON COLUMN landing_pages.custom_domain IS 'Custom domain for hosted pages';

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS seo_score INTEGER;
COMMENT ON COLUMN landing_pages.seo_score IS 'Automated SEO analysis score (0-100)';

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS accessibility_score INTEGER;
COMMENT ON COLUMN landing_pages.accessibility_score IS 'WCAG compliance score (0-100)';

-- ============================================================================
-- 2. Create landing_page_ai_chats table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landing_page_ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic')),
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE landing_page_ai_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage AI chats for accessible landing pages"
ON landing_page_ai_chats FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM landing_pages lp
    WHERE lp.id = landing_page_ai_chats.landing_page_id
    AND user_can_access_client(auth.uid(), lp.client_id)
  )
);

-- Indexes
CREATE INDEX idx_landing_page_ai_chats_page ON landing_page_ai_chats(landing_page_id);
CREATE INDEX idx_landing_page_ai_chats_user ON landing_page_ai_chats(user_id);

-- ============================================================================
-- 3. Create landing_page_exports table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landing_page_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  export_format TEXT NOT NULL CHECK (export_format IN ('static', 'react', 'wordpress', 'hosted')),
  export_url TEXT,
  configuration JSONB DEFAULT '{}',
  exported_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE landing_page_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view exports for accessible landing pages"
ON landing_page_exports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM landing_pages lp
    WHERE lp.id = landing_page_exports.landing_page_id
    AND user_can_access_client(auth.uid(), lp.client_id)
  )
);

CREATE POLICY "Users can create exports for accessible landing pages"
ON landing_page_exports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM landing_pages lp
    WHERE lp.id = landing_page_exports.landing_page_id
    AND user_can_access_client(auth.uid(), lp.client_id)
  )
);

-- Indexes
CREATE INDEX idx_landing_page_exports_page ON landing_page_exports(landing_page_id);
CREATE INDEX idx_landing_page_exports_format ON landing_page_exports(export_format);

-- ============================================================================
-- 4. Create helper functions
-- ============================================================================

-- Function to update landing page scores after analysis
CREATE OR REPLACE FUNCTION update_landing_page_scores(
  page_id UUID,
  seo_score_value INTEGER DEFAULT NULL,
  accessibility_score_value INTEGER DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET 
    seo_score = COALESCE(seo_score_value, seo_score),
    accessibility_score = COALESCE(accessibility_score_value, accessibility_score),
    updated_at = NOW()
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track AI token usage
CREATE OR REPLACE FUNCTION increment_landing_page_tokens(
  page_id UUID,
  tokens_used INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET 
    generation_tokens = generation_tokens + tokens_used,
    updated_at = NOW()
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE landing_page_ai_chats IS 'Stores AI chat history for iterative landing page design';
COMMENT ON TABLE landing_page_exports IS 'Tracks all exports of landing pages in different formats';
COMMENT ON COLUMN landing_pages.source_type IS 'How the page was created: text_prompt, image_upload, link_analysis, or manual';
COMMENT ON COLUMN landing_pages.visual_editor_state IS 'State for custom visual editor (element positions, z-index, etc)';

-- ============================================================================
-- 6. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_landing_pages_source_type ON landing_pages(source_type);
CREATE INDEX IF NOT EXISTS idx_landing_pages_ai_provider ON landing_pages(ai_provider);
CREATE INDEX IF NOT EXISTS idx_landing_pages_custom_domain ON landing_pages(custom_domain) WHERE custom_domain IS NOT NULL;

-- ============================================================================
-- Done!
-- ============================================================================

