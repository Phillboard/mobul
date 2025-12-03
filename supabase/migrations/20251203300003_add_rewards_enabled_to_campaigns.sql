-- Add rewards_enabled column to campaigns table
-- This stores whether gift card rewards are enabled for the campaign

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS rewards_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.rewards_enabled IS 'Whether gift card rewards are enabled for this campaign. When true, campaign conditions with gift cards will provision rewards.';

-- Set rewards_enabled = true for campaigns that have active conditions with gift cards configured
UPDATE campaigns c
SET rewards_enabled = true
WHERE EXISTS (
    SELECT 1 FROM campaign_conditions cc
    WHERE cc.campaign_id = c.id
    AND cc.is_active = true
    AND cc.brand_id IS NOT NULL
    AND cc.card_value IS NOT NULL
);

