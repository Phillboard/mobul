-- ============================================================================
-- Backfill Script: Fix campaign_id on recipients
-- ============================================================================
-- 
-- Purpose: Populate campaign_id on recipients that are missing it
-- This fixes the call center lookup issue where recipients can't be found
-- because their campaign_id is NULL.
--
-- Run this in Supabase SQL Editor
-- Safe to run multiple times - only updates NULL values
--
-- Date: 2025-01-21
-- ============================================================================

-- Step 1: Check current state BEFORE backfill
SELECT 
  'BEFORE BACKFILL' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id,
  ROUND(100.0 * COUNT(campaign_id) / NULLIF(COUNT(*), 0), 2) as percent_complete
FROM recipients;

-- Step 2: Backfill campaign_id using audience_id match
-- This links recipients to campaigns via their shared audience
-- Only affects recipients where campaign_id is currently NULL
UPDATE recipients r
SET campaign_id = c.id
FROM campaigns c
WHERE c.audience_id = r.audience_id
  AND r.campaign_id IS NULL
  AND c.audience_id IS NOT NULL;

-- Step 3: Check how many were updated
SELECT 
  'AFTER AUDIENCE BACKFILL' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as still_missing,
  ROUND(100.0 * COUNT(campaign_id) / NULLIF(COUNT(*), 0), 2) as percent_complete
FROM recipients;

-- Step 4: For recipients still missing campaign_id, try to find via gift card assignments
-- This handles cases where a gift card was already provisioned
UPDATE recipients r
SET campaign_id = gci.assigned_to_campaign_id
FROM gift_card_inventory gci
WHERE gci.assigned_to_recipient_id = r.id
  AND r.campaign_id IS NULL
  AND gci.assigned_to_campaign_id IS NOT NULL;

-- Step 5: Check final state
SELECT 
  'FINAL STATE' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as still_missing,
  ROUND(100.0 * COUNT(campaign_id) / NULLIF(COUNT(*), 0), 2) as percent_complete
FROM recipients;

-- Step 6: Show recipients still missing campaign_id (for investigation)
-- These may need manual attention
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
LIMIT 50;

-- ============================================================================
-- Optional: Verify a specific code works now
-- Replace 'YOUR-CODE-HERE' with an actual code you're testing
-- ============================================================================
-- SELECT 
--   r.id,
--   r.redemption_code,
--   r.campaign_id,
--   c.name as campaign_name,
--   c.status as campaign_status
-- FROM recipients r
-- LEFT JOIN campaigns c ON c.id = r.campaign_id
-- WHERE r.redemption_code = 'YOUR-CODE-HERE';
