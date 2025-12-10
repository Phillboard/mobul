-- Enhanced Campaign System - PART 2: Constraints and Indexes
-- Split from original migration for CLI compatibility

-- ============================================================================
-- Add validation constraints
-- ============================================================================

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_published_needs_landing_page;
ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_published_needs_landing_page 
CHECK (
  (status NOT IN ('in_production', 'mailed')) 
  OR landing_page_id IS NOT NULL 
  OR requires_codes = false
);

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_rewards_needs_pool;
ALTER TABLE campaigns
ADD CONSTRAINT campaigns_rewards_needs_pool
CHECK (
  (rewards_enabled = false OR rewards_enabled IS NULL)
  OR reward_pool_id IS NOT NULL
);

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

-- Add campaign_id to recipients if it doesn't exist
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_code_campaign 
ON recipients(redemption_code, campaign_id) 
WHERE redemption_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gift_cards_pool_status 
ON gift_cards(pool_id, status) 
WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_campaigns_rewards_enabled 
ON campaigns(client_id, rewards_enabled) 
WHERE rewards_enabled = true;

