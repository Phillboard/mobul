-- Enhanced Campaign System - PART 6: Data Migration & Grants
-- Split from original migration for CLI compatibility

-- ============================================================================
-- Migration support - grandfather existing campaigns
-- ============================================================================

UPDATE campaigns
SET 
  requires_codes = false,
  editable_after_publish = true,
  codes_uploaded = CASE 
    WHEN audience_id IS NOT NULL THEN true 
    ELSE false 
  END
WHERE requires_codes IS NULL OR requires_codes = true;

-- Set reward pool from existing campaign_reward_configs if exists
UPDATE campaigns c
SET reward_pool_id = (
  SELECT crc.gift_card_pool_id 
  FROM campaign_reward_configs crc 
  WHERE crc.campaign_id = c.id 
  ORDER BY crc.condition_number 
  LIMIT 1
),
rewards_enabled = true
WHERE reward_pool_id IS NULL
AND EXISTS (
  SELECT 1 FROM campaign_reward_configs crc 
  WHERE crc.campaign_id = c.id
);
