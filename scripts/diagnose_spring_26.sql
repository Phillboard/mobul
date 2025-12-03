-- ============================================================
-- DIAGNOSTIC SCRIPT: Campaign Configuration Health Check
-- ============================================================
-- Run this in Supabase SQL Editor to diagnose provisioning issues
-- ============================================================

-- 1. Find the "spring 26" campaign
SELECT '=== CAMPAIGN DETAILS ===' as section;
SELECT 
  id as campaign_id,
  campaign_name,
  client_id,
  status,
  created_at
FROM campaigns 
WHERE campaign_name ILIKE '%spring%26%' 
   OR campaign_name ILIKE '%spring 26%'
   OR campaign_name = 'spring 26';

-- 2. Check campaign_conditions for this campaign
SELECT '=== CAMPAIGN CONDITIONS ===' as section;
SELECT 
  cc.id as condition_id,
  cc.campaign_id,
  cc.condition_number,
  cc.condition_name,
  cc.trigger_type,
  cc.brand_id,
  cc.card_value,
  cc.sms_template,
  cc.is_active,
  gb.brand_name
FROM campaign_conditions cc
LEFT JOIN gift_card_brands gb ON cc.brand_id = gb.id
WHERE cc.campaign_id IN (
  SELECT id FROM campaigns 
  WHERE campaign_name ILIKE '%spring%26%' 
     OR campaign_name ILIKE '%spring 26%'
     OR campaign_name = 'spring 26'
);

-- 3. Check legacy campaign_gift_card_config table
SELECT '=== LEGACY GIFT CARD CONFIG ===' as section;
SELECT 
  cgc.*
FROM campaign_gift_card_config cgc
WHERE cgc.campaign_id IN (
  SELECT id FROM campaigns 
  WHERE campaign_name ILIKE '%spring%26%' 
     OR campaign_name ILIKE '%spring 26%'
     OR campaign_name = 'spring 26'
);

-- 4. List all enabled gift card brands (to verify we have valid brands to use)
SELECT '=== AVAILABLE ENABLED BRANDS ===' as section;
SELECT 
  id as brand_id,
  brand_name,
  tillo_brand_code,
  is_enabled_by_admin
FROM gift_card_brands
WHERE is_enabled_by_admin = true
ORDER BY brand_name
LIMIT 20;

-- 5. Check ALL campaigns with missing gift card config
SELECT '=== ALL CAMPAIGNS WITH MISSING CONFIG ===' as section;
SELECT 
  c.id as campaign_id,
  c.campaign_name,
  c.status,
  cc.id as condition_id,
  cc.condition_number,
  cc.condition_name,
  cc.brand_id,
  cc.card_value,
  cc.is_active,
  CASE 
    WHEN cc.brand_id IS NULL THEN 'MISSING brand_id'
    WHEN cc.card_value IS NULL THEN 'MISSING card_value'
    ELSE 'OK'
  END as config_status
FROM campaigns c
LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id AND cc.is_active = true
WHERE c.status IN ('active', 'draft', 'mailed')
  AND (cc.brand_id IS NULL OR cc.card_value IS NULL)
ORDER BY c.created_at DESC;

-- 6. Count summary
SELECT '=== SUMMARY ===' as section;
SELECT 
  (SELECT COUNT(*) FROM campaigns WHERE status IN ('active', 'draft', 'mailed')) as total_active_campaigns,
  (SELECT COUNT(*) FROM campaign_conditions WHERE is_active = true) as total_active_conditions,
  (SELECT COUNT(*) FROM campaign_conditions WHERE is_active = true AND brand_id IS NULL) as conditions_missing_brand,
  (SELECT COUNT(*) FROM campaign_conditions WHERE is_active = true AND card_value IS NULL) as conditions_missing_value,
  (SELECT COUNT(*) FROM gift_card_brands WHERE is_enabled_by_admin = true) as available_brands;

-- 7. Check recipients with redemption code AB6-1061
SELECT '=== RECIPIENT AB6-1061 ===' as section;
SELECT 
  r.id as recipient_id,
  r.first_name,
  r.last_name,
  r.redemption_code,
  r.sms_opt_in_status,
  r.verification_method,
  r.disposition,
  a.campaign_id,
  c.campaign_name
FROM recipients r
JOIN audiences a ON r.audience_id = a.id
JOIN campaigns c ON a.campaign_id = c.id
WHERE r.redemption_code = 'AB6-1061';

