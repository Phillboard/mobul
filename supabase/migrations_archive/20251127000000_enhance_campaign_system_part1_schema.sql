-- Enhanced Campaign System - PART 1: Schema Changes
-- Split from original migration for CLI compatibility

-- ============================================================================
-- Add new columns to campaigns table
-- ============================================================================

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS reward_pool_id UUID REFERENCES gift_card_pools(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reward_condition TEXT DEFAULT 'form_submission' CHECK (reward_condition IN ('form_submission', 'call_completed', 'immediate')),
ADD COLUMN IF NOT EXISTS rewards_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS editable_after_publish BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS codes_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_codes BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_campaigns_reward_pool ON campaigns(reward_pool_id) WHERE reward_pool_id IS NOT NULL;

-- ============================================================================
-- Add campaign_id to ace_forms and landing_pages
-- ============================================================================

ALTER TABLE ace_forms 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ace_forms_campaign ON ace_forms(campaign_id) WHERE campaign_id IS NOT NULL;

ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_landing_pages_campaign ON landing_pages(campaign_id) WHERE campaign_id IS NOT NULL;

-- ============================================================================
-- Create campaign_versions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  previous_state JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE campaign_versions ADD COLUMN IF NOT EXISTS changes JSONB NOT NULL DEFAULT '{}';
ALTER TABLE campaign_versions ADD COLUMN IF NOT EXISTS previous_state JSONB NOT NULL DEFAULT '{}';
ALTER TABLE campaign_versions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_campaign_versions_campaign ON campaign_versions(campaign_id, version_number DESC);

ALTER TABLE campaign_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view versions for accessible campaigns" ON campaign_versions;
CREATE POLICY "Users can view versions for accessible campaigns"
  ON campaign_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_versions.campaign_id 
      AND user_can_access_client(auth.uid(), campaigns.client_id)
    )
  );

DROP POLICY IF EXISTS "Users can create versions for accessible campaigns" ON campaign_versions;
CREATE POLICY "Users can create versions for accessible campaigns"
  ON campaign_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_versions.campaign_id 
      AND user_can_access_client(auth.uid(), campaigns.client_id)
    )
  );

