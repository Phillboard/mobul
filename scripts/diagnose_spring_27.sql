-- ============================================================
-- COMPREHENSIVE DIAGNOSTIC FOR SPRING 27 CAMPAIGN
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- Query 1: Find Spring 27 Campaign
SELECT '=== QUERY 1: SPRING 27 CAMPAIGN ===' as section;

SELECT 
  id,
  name,
  status,
  mailing_method,
  client_id,
  audience_id,
  created_at
FROM campaigns 
WHERE name ILIKE '%spring%27%' OR name ILIKE '%spring 27%'
ORDER BY created_at DESC;

-- Query 2: Check Campaign Conditions with Gift Card Data
SELECT '=== QUERY 2: CAMPAIGN CONDITIONS ===' as section;

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
  gb.brand_name as resolved_brand_name,
  cc.created_at
FROM campaign_conditions cc
LEFT JOIN gift_card_brands gb ON cc.brand_id = gb.id
WHERE cc.campaign_id IN (
  SELECT id FROM campaigns 
  WHERE name ILIKE '%spring%27%' OR name ILIKE '%spring 27%'
)
ORDER BY cc.condition_number;

-- Query 3: Check Gift Card Config Table
SELECT '=== QUERY 3: GIFT CARD CONFIG TABLE ===' as section;

SELECT 
  gc.id,
  gc.campaign_id,
  gc.condition_number,
  gc.brand_id,
  gc.denomination,
  gb.brand_name as resolved_brand_name,
  gc.created_at
FROM campaign_gift_card_config gc
LEFT JOIN gift_card_brands gb ON gc.brand_id = gb.id
WHERE gc.campaign_id IN (
  SELECT id FROM campaigns 
  WHERE name ILIKE '%spring%27%' OR name ILIKE '%spring 27%'
);

-- Query 4: Available Gift Card Brands (Starbucks specifically)
SELECT '=== QUERY 4: GIFT CARD BRANDS ===' as section;

SELECT 
  id,
  brand_name,
  is_enabled_by_admin,
  logo_url
FROM gift_card_brands
WHERE brand_name ILIKE '%starbucks%'
   OR is_enabled_by_admin = true
ORDER BY brand_name;

-- Query 5: Recipients for Spring 27 (verify audience linkage)
SELECT '=== QUERY 5: RECIPIENTS ===' as section;

SELECT 
  r.id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.audience_id,
  a.campaign_id,
  c.name as campaign_name,
  c.status as campaign_status
FROM recipients r
JOIN audiences a ON r.audience_id = a.id
JOIN campaigns c ON a.campaign_id = c.id
WHERE c.name ILIKE '%spring%27%' OR c.name ILIKE '%spring 27%'
LIMIT 10;

-- Query 6: Check RLS policies on campaign_conditions
SELECT '=== QUERY 6: RLS POLICIES ===' as section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'campaign_conditions';

-- Summary diagnostic
SELECT '=== SUMMARY ===' as section;

SELECT 
  'campaigns' as table_name,
  COUNT(*) as spring_27_count
FROM campaigns 
WHERE name ILIKE '%spring%27%' OR name ILIKE '%spring 27%'

UNION ALL

SELECT 
  'campaign_conditions' as table_name,
  COUNT(*) as spring_27_count
FROM campaign_conditions cc
WHERE cc.campaign_id IN (
  SELECT id FROM campaigns 
  WHERE name ILIKE '%spring%27%' OR name ILIKE '%spring 27%'
)

UNION ALL

SELECT 
  'conditions_with_brand' as table_name,
  COUNT(*) as spring_27_count
FROM campaign_conditions cc
WHERE cc.campaign_id IN (
  SELECT id FROM campaigns 
  WHERE name ILIKE '%spring%27%' OR name ILIKE '%spring 27%'
)
AND cc.brand_id IS NOT NULL

UNION ALL

SELECT 
  'campaign_gift_card_config' as table_name,
  COUNT(*) as spring_27_count
FROM campaign_gift_card_config gc
WHERE gc.campaign_id IN (
  SELECT id FROM campaigns 
  WHERE name ILIKE '%spring%27%' OR name ILIKE '%spring 27%'
)

UNION ALL

SELECT 
  'recipients' as table_name,
  COUNT(*) as spring_27_count
FROM recipients r
JOIN audiences a ON r.audience_id = a.id
WHERE a.campaign_id IN (
  SELECT id FROM campaigns 
  WHERE name ILIKE '%spring%27%' OR name ILIKE '%spring 27%'
);

