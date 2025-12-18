-- ============================================================
-- Diagnose Provisioning Failure
-- ============================================================
-- Simulates exactly what the provision function queries
-- ============================================================

-- 1. Get the brand ID from the campaign condition
SELECT 
  'Campaign Config' as check_type,
  c.name as campaign_name,
  cc.brand_id,
  gcb.brand_name,
  cc.card_value
FROM campaigns c
JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
WHERE c.name ILIKE '%Gaurdian%';

-- 2. Check exact query the provision function uses
-- This should match what provision-gift-card-unified does
SELECT 
  'Provision Query Result' as check_type,
  gci.id,
  gci.brand_id,
  gci.denomination,
  gci.status,
  gci.assigned_to_recipient_id,
  gci.assigned_to_campaign_id
FROM gift_card_inventory gci
WHERE gci.brand_id = 'ddab574b-42a7-4f0e-9924-cb7e421f9263'  -- Starbucks brand ID
  AND gci.denomination = 10  -- The configured card_value
  AND gci.status = 'available'
  AND gci.assigned_to_recipient_id IS NULL
LIMIT 5;

-- 3. Check with different denomination formats (in case of type mismatch)
SELECT 
  'Type Check' as check_type,
  gci.denomination,
  pg_typeof(gci.denomination) as denomination_type,
  COUNT(*) as count
FROM gift_card_inventory gci
WHERE gci.brand_id = 'ddab574b-42a7-4f0e-9924-cb7e421f9263'
  AND gci.status = 'available'
GROUP BY gci.denomination, pg_typeof(gci.denomination);

-- 4. Check if brand is enabled
SELECT 
  'Brand Status' as check_type,
  id,
  brand_name,
  is_enabled_by_admin,
  tillo_brand_code,
  brand_code
FROM gift_card_brands
WHERE id = 'ddab574b-42a7-4f0e-9924-cb7e421f9263';

-- 5. Check what cards are available for this exact brand
SELECT 
  'Available Cards for Brand' as check_type,
  COUNT(*) as total_available,
  denomination
FROM gift_card_inventory
WHERE brand_id = 'ddab574b-42a7-4f0e-9924-cb7e421f9263'
  AND status = 'available'
  AND assigned_to_recipient_id IS NULL
GROUP BY denomination;
