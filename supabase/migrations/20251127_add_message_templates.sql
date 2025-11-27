-- Message Template System
-- Allows users to customize SMS and email messages sent to customers

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('sms', 'email')),
  name TEXT NOT NULL,
  subject TEXT, -- For email only
  body_template TEXT NOT NULL,
  available_merge_tags JSONB DEFAULT '["first_name", "last_name", "card_code", "card_value", "brand_name", "expiration_date", "company_name"]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, name, template_type)
);

CREATE TABLE IF NOT EXISTS campaign_message_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sms_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  email_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  custom_merge_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id)
);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_message_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_templates
CREATE POLICY "Users can view templates for their clients"
  ON message_templates FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create templates for their clients"
  ON message_templates FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update templates for their clients"
  ON message_templates FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete templates for their clients"
  ON message_templates FOR DELETE
  USING (user_can_access_client(auth.uid(), client_id));

-- RLS Policies for campaign_message_settings
CREATE POLICY "Users can view message settings for accessible campaigns"
  ON campaign_message_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND user_can_access_client(auth.uid(), c.client_id)
  ));

CREATE POLICY "Users can manage message settings for accessible campaigns"
  ON campaign_message_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_id
    AND user_can_access_client(auth.uid(), c.client_id)
  ));

-- Indexes
CREATE INDEX idx_message_templates_client ON message_templates(client_id, template_type);
CREATE INDEX idx_campaign_message_settings_campaign ON campaign_message_settings(campaign_id);

COMMENT ON TABLE message_templates IS 'Customizable SMS and email templates with merge tag support';
COMMENT ON TABLE campaign_message_settings IS 'Links campaigns to their message templates';

