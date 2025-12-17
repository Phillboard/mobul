-- Migration: Add campaign_id to recipients table
-- Purpose: Direct campaign link for faster queries and reliable lookups
-- Date: 2025-12-17

-- Step 1: Add campaign_id column to recipients
ALTER TABLE recipients 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

-- Step 2: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id 
ON recipients(campaign_id);

-- Step 3: Backfill existing recipients from their audience's campaign
UPDATE recipients r
SET campaign_id = c.id
FROM audiences a
JOIN campaigns c ON c.audience_id = a.id
WHERE r.audience_id = a.id
  AND r.campaign_id IS NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN recipients.campaign_id IS 'Direct reference to campaign for efficient lookups. Backfilled from audiences.';
