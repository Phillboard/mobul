-- ============================================================
-- Check Campaign Gift Card Configuration
-- ============================================================
-- Run this to see what brand/denomination the campaign condition
-- is configured for vs what's available in inventory.
-- ============================================================

-- 1. Show all campaign conditions with their gift card config
SELECT 
  c.name as campaign_name,
  cc.condition_number,
  cc.condition_name,
  gcb.brand_name as configured_brand,
  cc.card_value as configured_denomination,
  cc.brand_id
FROM campaigns c
JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
WHERE c.status IN ('in_production', 'mailed', 'scheduled')
ORDER BY c.name, cc.condition_number;

-- 2. Show available inventory by brand
SELECT 
  gcb.id as brand_id,
  gcb.brand_name,
  gci.denomination,
  COUNT(*) as available_count
FROM gift_card_inventory gci
JOIN gift_card_brands gcb ON gcb.id = gci.brand_id
WHERE gci.status = 'available'
GROUP BY gcb.id, gcb.brand_name, gci.denomination
ORDER BY gcb.brand_name, gci.denomination;

-- 3. Check the specific campaign (Gaurdian Auto Warranty)
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  cc.id as condition_id,
  cc.condition_number,
  cc.condition_name,
  cc.brand_id,
  gcb.brand_name,
  cc.card_value
FROM campaigns c
JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
WHERE c.name ILIKE '%Gaurdian%' OR c.name ILIKE '%Guardian%' OR c.name ILIKE '%auto warranty%';
