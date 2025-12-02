-- Diagnostic Query: Find why code lookup is failing
-- Run this in Supabase SQL Editor to diagnose the issue

-- Step 1: Check if the recipient exists
SELECT 
  'Step 1: Does recipient exist?' as check_name,
  id,
  redemption_code,
  first_name,
  last_name,
  phone,
  email,
  approval_status,
  audience_id
FROM recipients
WHERE redemption_code = 'AB6-1061'
   OR redemption_code = 'ab6-1061'
   OR UPPER(redemption_code) = 'AB6-1061';

-- Step 2: Check if the audience has a campaign
SELECT 
  'Step 2: Campaign linked to audience?' as check_name,
  c.id as campaign_id,
  c.name as campaign_name,
  c.status as campaign_status,
  a.id as audience_id,
  a.name as audience_name
FROM campaigns c
INNER JOIN audiences a ON c.audience_id = a.id
WHERE a.id IN (
  SELECT audience_id FROM recipients 
  WHERE UPPER(redemption_code) = 'AB6-1061'
);

-- Step 3: Test the exact query the call center uses
SELECT 
  'Step 3: Exact call center query result' as check_name,
  r.*,
  a.id as audience_id,
  a.name as audience_name,
  c.id as campaign_id,
  c.name as campaign_name
FROM recipients r
INNER JOIN audiences a ON r.audience_id = a.id
INNER JOIN campaigns c ON c.audience_id = a.id
WHERE UPPER(r.redemption_code) = 'AB6-1061';

-- Step 4: Check campaign conditions exist
SELECT 
  'Step 4: Campaign conditions configured?' as check_name,
  cc.id,
  cc.campaign_id,
  cc.condition_number,
  cc.condition_name,
  cc.trigger_type,
  cc.is_active,
  c.name as campaign_name
FROM campaign_conditions cc
INNER JOIN campaigns c ON cc.campaign_id = c.id
WHERE c.audience_id IN (
  SELECT audience_id FROM recipients 
  WHERE UPPER(redemption_code) = 'AB6-1061'
);

-- Step 5: Check if gift card pool is assigned to campaign
SELECT 
  'Step 5: Gift card pool assigned?' as check_name,
  crc.campaign_id,
  crc.condition_number,
  crc.gift_card_pool_id,
  gcp.pool_name,
  gcp.available_cards,
  gb.name as brand_name
FROM campaign_reward_configs crc
INNER JOIN gift_card_pools gcp ON crc.gift_card_pool_id = gcp.id
INNER JOIN gift_card_brands gb ON gcp.brand_id = gb.id
WHERE crc.campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE c.audience_id IN (
    SELECT audience_id FROM recipients 
    WHERE UPPER(redemption_code) = 'AB6-1061'
  )
);

-- Step 6: Summary - What's missing?
SELECT 
  'Step 6: DIAGNOSIS SUMMARY' as check_name,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM recipients WHERE UPPER(redemption_code) = 'AB6-1061') 
    THEN '❌ PROBLEM: Recipient code does not exist'
    WHEN NOT EXISTS (
      SELECT 1 FROM recipients r
      INNER JOIN audiences a ON r.audience_id = a.id
      INNER JOIN campaigns c ON c.audience_id = a.id
      WHERE UPPER(r.redemption_code) = 'AB6-1061'
    ) 
    THEN '❌ PROBLEM: Recipient exists but no campaign linked to audience'
    WHEN NOT EXISTS (
      SELECT 1 FROM campaign_conditions cc
      INNER JOIN campaigns c ON cc.campaign_id = c.id
      WHERE c.audience_id IN (
        SELECT audience_id FROM recipients 
        WHERE UPPER(redemption_code) = 'AB6-1061'
      )
    )
    THEN '❌ PROBLEM: Campaign exists but no conditions configured'
    WHEN NOT EXISTS (
      SELECT 1 FROM campaign_reward_configs crc
      WHERE crc.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.audience_id IN (
          SELECT audience_id FROM recipients 
          WHERE UPPER(redemption_code) = 'AB6-1061'
        )
      )
    )
    THEN '❌ PROBLEM: Campaign conditions exist but no gift card pool assigned'
    ELSE '✅ All data looks good - check RLS policies or query logic'
  END as diagnosis;

