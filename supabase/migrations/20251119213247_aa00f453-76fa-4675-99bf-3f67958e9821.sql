-- Phase 1: Database Schema Redesign for AI-First Workflow

-- ============================================================================
-- 1.1 Update landing_pages table
-- ============================================================================
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS editor_state TEXT DEFAULT 'ai_editing' CHECK (editor_state IN ('ai_editing', 'manual_editing', 'completed'));
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS ai_chat_history JSONB DEFAULT '[]';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS design_iterations INTEGER DEFAULT 0;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS manual_edits_count INTEGER DEFAULT 0;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS grapesjs_project JSONB;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS design_metadata JSONB DEFAULT '{}';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS last_ai_edit_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS first_manual_edit_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 1.2 Update templates table (Mailers)
-- ============================================================================
ALTER TABLE templates ADD COLUMN IF NOT EXISTS editor_state TEXT DEFAULT 'ai_editing' CHECK (editor_state IN ('ai_editing', 'manual_editing', 'completed'));
ALTER TABLE templates ADD COLUMN IF NOT EXISTS ai_chat_history JSONB DEFAULT '[]';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS design_iterations INTEGER DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS manual_edits_count INTEGER DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS grapesjs_project JSONB;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS design_metadata JSONB DEFAULT '{}';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS last_ai_edit_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS first_manual_edit_at TIMESTAMP WITH TIME ZONE;

-- Print-specific columns for mailers
ALTER TABLE templates ADD COLUMN IF NOT EXISTS print_specifications JSONB DEFAULT '{
  "dpi": 300,
  "colorMode": "CMYK",
  "bleedInches": 0.125,
  "safeZoneInches": 0.25,
  "trimSize": {"width": 6, "height": 4, "unit": "inches"}
}';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS has_back_design BOOLEAN DEFAULT false;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS back_grapesjs_project JSONB;

-- ============================================================================
-- 1.3 Create design_versions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  design_type TEXT NOT NULL CHECK (design_type IN ('landing_page', 'mailer')),
  design_id UUID NOT NULL,
  
  version_number INTEGER NOT NULL,
  version_name TEXT,
  
  grapesjs_snapshot JSONB NOT NULL,
  thumbnail_url TEXT,
  
  change_type TEXT NOT NULL CHECK (change_type IN ('ai_generation', 'ai_refinement', 'manual_edit', 'restore')),
  change_description TEXT,
  ai_prompt TEXT,
  
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  performance_score JSONB,
  
  UNIQUE(design_type, design_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_design_versions_lookup ON design_versions(design_type, design_id, version_number DESC);

ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view design versions for their client's designs" ON design_versions
  FOR SELECT
  USING (
    CASE 
      WHEN design_type = 'landing_page' THEN
        EXISTS (
          SELECT 1 FROM landing_pages lp
          JOIN clients c ON c.id = lp.client_id
          WHERE lp.id = design_versions.design_id
            AND user_can_access_client(auth.uid(), c.id)
        )
      WHEN design_type = 'mailer' THEN
        EXISTS (
          SELECT 1 FROM templates t
          JOIN clients c ON c.id = t.client_id
          WHERE t.id = design_versions.design_id
            AND user_can_access_client(auth.uid(), c.id)
        )
      ELSE false
    END
  );

CREATE POLICY "Users can create design versions for their client's designs" ON design_versions
  FOR INSERT
  WITH CHECK (
    CASE 
      WHEN design_type = 'landing_page' THEN
        EXISTS (
          SELECT 1 FROM landing_pages lp
          JOIN clients c ON c.id = lp.client_id
          WHERE lp.id = design_versions.design_id
            AND user_can_access_client(auth.uid(), c.id)
        )
      WHEN design_type = 'mailer' THEN
        EXISTS (
          SELECT 1 FROM templates t
          JOIN clients c ON c.id = t.client_id
          WHERE t.id = design_versions.design_id
            AND user_can_access_client(auth.uid(), c.id)
        )
      ELSE false
    END
  );

-- ============================================================================
-- 1.4 Create brand_kits table
-- ============================================================================
CREATE TABLE IF NOT EXISTS brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  
  colors JSONB NOT NULL DEFAULT '{
    "primary": "#000000",
    "secondary": "#666666", 
    "accent": "#FF6B00",
    "background": "#FFFFFF",
    "text": "#1F2937",
    "palettes": [
      {"name": "Main", "colors": ["#000000", "#666666", "#FF6B00"]},
      {"name": "Light", "colors": ["#FFFFFF", "#F3F4F6", "#E5E7EB"]}
    ]
  }',
  
  fonts JSONB NOT NULL DEFAULT '{
    "heading": {"family": "Inter", "weights": [600, 700, 800]},
    "body": {"family": "Inter", "weights": [400, 500]},
    "custom": []
  }',
  
  logo_urls JSONB DEFAULT '{"primary": null, "white": null, "black": null}',
  icon_url TEXT,
  
  design_style TEXT CHECK (design_style IN ('modern', 'bold', 'luxury', 'minimal', 'playful')),
  
  tagline TEXT,
  value_propositions JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(client_id, name)
);

CREATE INDEX IF NOT EXISTS idx_brand_kits_client ON brand_kits(client_id);

ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view brand kits for their clients" ON brand_kits
  FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create brand kits for their clients" ON brand_kits
  FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update brand kits for their clients" ON brand_kits
  FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete brand kits for their clients" ON brand_kits
  FOR DELETE
  USING (user_can_access_client(auth.uid(), client_id));

-- ============================================================================
-- 1.5 Create ai_design_sessions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_design_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  design_type TEXT NOT NULL CHECK (design_type IN ('landing_page', 'mailer')),
  design_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_duration_seconds INTEGER,
  
  total_ai_messages INTEGER DEFAULT 0,
  total_ai_tokens INTEGER DEFAULT 0,
  total_ai_cost_usd DECIMAL(10, 4) DEFAULT 0,
  
  iterations_count INTEGER DEFAULT 0,
  switched_to_manual BOOLEAN DEFAULT false,
  switched_to_manual_at TIMESTAMP WITH TIME ZONE,
  
  session_outcome TEXT CHECK (session_outcome IN ('saved', 'published', 'abandoned')),
  user_satisfaction_score INTEGER CHECK (user_satisfaction_score BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_design ON ai_design_sessions(design_type, design_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_design_sessions(user_id);

ALTER TABLE ai_design_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI design sessions" ON ai_design_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI design sessions" ON ai_design_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI design sessions" ON ai_design_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);