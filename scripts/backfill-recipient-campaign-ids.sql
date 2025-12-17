-- Backfill Script: Set campaign_id on recipients
-- Run this AFTER adding the campaign_id column
-- This script is safe to run multiple times

-- Check current state
SELECT 
  'Before backfill' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id
FROM recipients;

-- Method 1: Via audiences table
-- This sets campaign_id based on campaigns.audience_id matching recipients.audience_id
UPDATE recipients r
SET campaign_id = c.id
FROM campaigns c
WHERE c.audience_id = r.audience_id
  AND r.campaign_id IS NULL;

-- Check progress
SELECT 
  'After audience-based backfill' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id
FROM recipients;

-- Method 2: Via recipient_gift_cards junction table
-- For recipients who have been assigned gift cards, we can find their campaign
UPDATE recipients r
SET campaign_id = rgc.campaign_id
FROM recipient_gift_cards rgc
WHERE rgc.recipient_id = r.id
  AND r.campaign_id IS NULL
  AND rgc.campaign_id IS NOT NULL;

-- Check progress
SELECT 
  'After gift-card-based backfill' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id
FROM recipients;

-- Method 3: Via call_sessions
UPDATE recipients r
SET campaign_id = cs.campaign_id
FROM call_sessions cs
WHERE cs.recipient_id = r.id
  AND r.campaign_id IS NULL
  AND cs.campaign_id IS NOT NULL;

-- Final check
SELECT 
  'After all backfills' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id
FROM recipients;

-- Show orphaned recipients (no campaign found)
SELECT 
  r.id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.audience_id,
  a.name as audience_name,
  r.created_at
FROM recipients r
LEFT JOIN audiences a ON a.id = r.audience_id
WHERE r.campaign_id IS NULL
ORDER BY r.created_at DESC
LIMIT 100;
