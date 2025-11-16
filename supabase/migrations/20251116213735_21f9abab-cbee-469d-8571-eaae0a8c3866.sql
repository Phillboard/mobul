-- Create landing_pages table
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  published BOOLEAN DEFAULT false,
  
  -- Editor content (JSON structure for drag-drop elements)
  content_json JSONB NOT NULL DEFAULT '{"version": "1.0", "blocks": []}'::jsonb,
  
  -- Compiled HTML output (for fast serving)
  html_content TEXT,
  css_content TEXT,
  
  -- SEO & Meta
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  
  -- AI Generation tracking
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  
  -- Version control
  version_number INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID,
  
  UNIQUE(client_id, slug)
);

-- Enable RLS
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage landing pages for accessible clients"
ON landing_pages FOR ALL
USING (user_can_access_client(auth.uid(), client_id));

-- Create landing_page_versions table
CREATE TABLE landing_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  content_json JSONB NOT NULL,
  html_content TEXT,
  change_description TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(landing_page_id, version_number)
);

-- Enable RLS
ALTER TABLE landing_page_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view versions for accessible landing pages"
ON landing_page_versions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM landing_pages lp
  WHERE lp.id = landing_page_versions.landing_page_id
  AND user_can_access_client(auth.uid(), lp.client_id)
));

-- Create gift_card_redemptions table
CREATE TABLE gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  gift_card_delivery_id UUID REFERENCES gift_card_deliveries(id),
  
  -- Redemption tracking
  code_entered TEXT NOT NULL,
  redemption_status TEXT NOT NULL DEFAULT 'pending',
  redemption_ip TEXT,
  redemption_user_agent TEXT,
  
  -- Admin override
  approved_by_user_id UUID,
  rejection_reason TEXT,
  
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gift_card_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view redemptions for accessible campaigns"
ON gift_card_redemptions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM campaigns c
  WHERE c.id = gift_card_redemptions.campaign_id
  AND user_can_access_client(auth.uid(), c.client_id)
));

CREATE POLICY "Public can create redemptions"
ON gift_card_redemptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update redemptions"
ON gift_card_redemptions FOR UPDATE
USING (true);

-- Add landing_page_id to campaigns table
ALTER TABLE campaigns 
ADD COLUMN landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_campaigns_landing_page ON campaigns(landing_page_id);
CREATE INDEX idx_gift_card_redemptions_campaign ON gift_card_redemptions(campaign_id);
CREATE INDEX idx_gift_card_redemptions_recipient ON gift_card_redemptions(recipient_id);

-- Add permissions
INSERT INTO permissions (name, module, description) VALUES
  ('landingpages.view', 'landingpages', 'View landing pages'),
  ('landingpages.create', 'landingpages', 'Create landing pages'),
  ('landingpages.edit', 'landingpages', 'Edit landing pages'),
  ('landingpages.delete', 'landingpages', 'Delete landing pages'),
  ('landingpages.publish', 'landingpages', 'Publish landing pages'),
  ('landingpages.ai_generate', 'landingpages', 'Generate pages with AI');