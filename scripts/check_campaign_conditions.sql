-- Diagnostic query to check campaign conditions and their gift card configuration

-- 1. Check all campaign conditions and their gift card config
SELECT 
  c.campaign_name,
  cc.condition_number,
  cc.condition_name,
  cc.brand_id,
  cc.card_value,
  cc.is_active,
  gb.brand_name
FROM campaign_conditions cc
JOIN campaigns c ON cc.campaign_id = c.id
LEFT JOIN gift_card_brands gb ON cc.brand_id = gb.id
ORDER BY c.campaign_name, cc.condition_number;

-- 2. Check available enabled brands
SELECT id, brand_name, is_enabled_by_admin 
FROM gift_card_brands 
WHERE is_enabled_by_admin = true
LIMIT 10;

-- 3. Check if spring 26 campaign exists and its conditions
SELECT 
  c.id as campaign_id,
  c.campaign_name,
  cc.id as condition_id,
  cc.condition_number,
  cc.condition_name,
  cc.brand_id,
  cc.card_value,
  cc.is_active
FROM campaigns c
LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id
WHERE c.campaign_name ILIKE '%spring%26%' OR c.campaign_name ILIKE '%spring 26%';

