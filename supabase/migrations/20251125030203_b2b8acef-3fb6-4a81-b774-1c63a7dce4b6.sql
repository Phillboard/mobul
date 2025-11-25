-- Create custom field definitions table
CREATE TABLE contact_custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multi-select', 'url', 'email')),
  options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  field_group TEXT DEFAULT 'Custom Fields',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, field_name)
);

-- Add RLS policies
ALTER TABLE contact_custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom field definitions for their clients"
  ON contact_custom_field_definitions FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create custom field definitions for their clients"
  ON contact_custom_field_definitions FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update custom field definitions for their clients"
  ON contact_custom_field_definitions FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete custom field definitions for their clients"
  ON contact_custom_field_definitions FOR DELETE
  USING (user_can_access_client(auth.uid(), client_id));

-- Add index for performance
CREATE INDEX idx_custom_field_defs_client ON contact_custom_field_definitions(client_id);
CREATE INDEX idx_custom_field_defs_active ON contact_custom_field_definitions(client_id, is_active) WHERE is_active = true;

-- Add engagement_score column to contacts if not exists
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_contacts_engagement_score ON contacts(engagement_score);

-- Add calculated fields for engagement tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_interactions INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS redemptions_count INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_opens_count INTEGER DEFAULT 0;

-- Create function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_last_activity_date TIMESTAMPTZ,
  p_total_interactions INTEGER,
  p_redemptions_count INTEGER,
  p_email_opens_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_recency INTEGER := 0;
  v_frequency INTEGER := 0;
  v_campaign_engagement INTEGER := 0;
  v_days_since_activity INTEGER;
BEGIN
  -- Calculate recency score (0-40 points)
  IF p_last_activity_date IS NOT NULL THEN
    v_days_since_activity := EXTRACT(DAY FROM now() - p_last_activity_date)::INTEGER;
    v_recency := CASE
      WHEN v_days_since_activity < 7 THEN 40
      WHEN v_days_since_activity < 30 THEN 30
      WHEN v_days_since_activity < 90 THEN 15
      WHEN v_days_since_activity < 180 THEN 5
      ELSE 0
    END;
  END IF;

  -- Calculate frequency score (0-30 points)
  v_frequency := LEAST(FLOOR(LOG(COALESCE(p_total_interactions, 0) + 1) * 10), 30)::INTEGER;

  -- Calculate campaign engagement score (0-30 points)
  v_campaign_engagement := LEAST(
    (COALESCE(p_redemptions_count, 0) * 10) + (COALESCE(p_email_opens_count, 0) * 2),
    30
  )::INTEGER;

  RETURN v_recency + v_frequency + v_campaign_engagement;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update engagement score
CREATE OR REPLACE FUNCTION update_contact_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_score := calculate_engagement_score(
    NEW.last_activity_date,
    NEW.total_interactions,
    NEW.redemptions_count,
    NEW.email_opens_count
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_engagement_score
  BEFORE INSERT OR UPDATE OF last_activity_date, total_interactions, redemptions_count, email_opens_count
  ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_engagement_score();