-- ============================================
-- GIFT CARD SYSTEM AUDIT
-- Comprehensive analysis of gift card provisioning
-- ============================================

-- Check 1: Gift card brands available
SELECT 
  '1. Gift Card Brands Status' as report_section,
  id as brand_id,
  brand_name,
  brand_code,
  provider,
  is_active,
  
  -- Check if any campaigns use this brand
  (SELECT COUNT(*) FROM campaign_gift_card_config WHERE brand_id = gb.id) as campaigns_using,
  
  -- Check if any clients have access
  (SELECT COUNT(DISTINCT client_id) FROM client_available_gift_cards WHERE brand_id = gb.id) as clients_with_access,
  
  -- Check inventory
  (SELECT COUNT(*) FROM gift_card_inventory WHERE brand_id = gb.id AND status = 'available') as available_inventory,
  (SELECT COUNT(*) FROM gift_card_inventory WHERE brand_id = gb.id) as total_inventory,
  
  CASE 
    WHEN is_active = false THEN '⚠ Inactive brand'
    WHEN (SELECT COUNT(*) FROM gift_card_inventory WHERE brand_id = gb.id AND status = 'available') = 0 
      THEN '⚠ No inventory'
    ELSE '✓ Ready'
  END as brand_health
  
FROM gift_card_brands gb
ORDER BY campaigns_using DESC, brand_name;

-- Check 2: Client gift card access matrix
SELECT 
  '2. Client Gift Card Access Matrix' as report_section,
  cl.name as client_name,
  gb.brand_name,
  cag.denomination,
  cag.is_enabled,
  
  -- Check if inventory exists
  (SELECT COUNT(*) FROM gift_card_inventory gi
   WHERE gi.brand_id = cag.brand_id 
     AND gi.denomination = cag.denomination 
     AND gi.status = 'available') as available_inventory,
  
  -- Check if any campaign uses this
  (SELECT COUNT(*) FROM campaign_gift_card_config gc
   INNER JOIN campaigns c ON c.id = gc.campaign_id
   WHERE c.client_id = cl.id 
     AND gc.brand_id = cag.brand_id 
     AND gc.denomination = cag.denomination) as campaigns_using,
  
  CASE 
    WHEN cag.is_enabled = false THEN '⚠ Disabled'
    WHEN (SELECT COUNT(*) FROM gift_card_inventory gi
      WHERE gi.brand_id = cag.brand_id AND gi.denomination = cag.denomination AND gi.status = 'available') = 0
      THEN '⚠ No inventory'
    ELSE '✓ Ready'
  END as access_status
  
FROM client_available_gift_cards cag
INNER JOIN clients cl ON cl.id = cag.client_id
INNER JOIN gift_card_brands gb ON gb.id = cag.brand_id
ORDER BY cl.name, gb.brand_name, cag.denomination;

-- Check 3: Gift card inventory status
SELECT 
  '3. Gift Card Inventory Status' as report_section,
  gb.brand_name,
  gi.denomination,
  gi.status,
  COUNT(*) as card_count,
  MIN(gi.uploaded_at) as oldest_card,
  MAX(gi.uploaded_at) as newest_card,
  COUNT(DISTINCT gi.upload_batch_id) as batch_count
FROM gift_card_inventory gi
INNER JOIN gift_card_brands gb ON gb.id = gi.brand_id
GROUP BY gb.brand_name, gi.denomination, gi.status
ORDER BY gb.brand_name, gi.denomination, gi.status;

-- Check 4: Campaign gift card configuration validation
SELECT 
  '4. Campaign Gift Card Validation' as report_section,
  c.name as campaign_name,
  gc.condition_number,
  gb.brand_name,
  gc.denomination,
  
  -- Validate brand exists and active
  CASE WHEN gb.is_active THEN '✓' ELSE '❌' END as brand_active,
  
  -- Validate client has access
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM client_available_gift_cards 
      WHERE client_id = c.client_id 
        AND brand_id = gc.brand_id 
        AND denomination = gc.denomination
        AND is_enabled = true
    ) THEN '✓' ELSE '❌' 
  END as client_has_access,
  
  -- Validate inventory exists
  (SELECT COUNT(*) FROM gift_card_inventory 
   WHERE brand_id = gc.brand_id 
     AND denomination = gc.denomination 
     AND status = 'available') as available_cards,
  
  -- Validate condition exists
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM campaign_conditions 
      WHERE campaign_id = gc.campaign_id 
        AND condition_number = gc.condition_number
    ) THEN '✓' ELSE '❌' 
  END as condition_exists,
  
  -- Overall status
  CASE 
    WHEN gb.is_active = false THEN '❌ Brand inactive'
    WHEN NOT EXISTS (
      SELECT 1 FROM client_available_gift_cards 
      WHERE client_id = c.client_id AND brand_id = gc.brand_id AND is_enabled = true
    ) THEN '❌ Client has no access'
    WHEN (SELECT COUNT(*) FROM gift_card_inventory 
      WHERE brand_id = gc.brand_id AND denomination = gc.denomination AND status = 'available') = 0
      THEN '⚠ No inventory'
    WHEN NOT EXISTS (
      SELECT 1 FROM campaign_conditions 
      WHERE campaign_id = gc.campaign_id AND condition_number = gc.condition_number
    ) THEN '❌ No matching condition'
    ELSE '✓ VALID'
  END as validation_status
  
FROM campaign_gift_card_config gc
INNER JOIN campaigns c ON c.id = gc.campaign_id
INNER JOIN gift_card_brands gb ON gb.id = gc.brand_id
ORDER BY validation_status ASC, c.name;

-- Check 5: Missing configurations
SELECT 
  '5. Campaigns Missing Gift Card Config' as report_section,
  c.id,
  c.name,
  c.status,
  (SELECT COUNT(*) FROM campaign_conditions WHERE campaign_id = c.id) as conditions_count,
  (SELECT COUNT(*) FROM campaign_gift_card_config WHERE campaign_id = c.id) as gift_configs_count,
  
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id)
      THEN '❌ CRITICAL: No gift cards configured at all'
    WHEN (SELECT COUNT(*) FROM campaign_conditions WHERE campaign_id = c.id) > 
         (SELECT COUNT(*) FROM campaign_gift_card_config WHERE campaign_id = c.id)
      THEN '⚠ WARNING: Some conditions missing gift cards'
    ELSE '✓ All conditions have gift cards'
  END as config_status
  
FROM campaigns c
WHERE c.status IN ('active', 'scheduled', 'approved')
ORDER BY config_status ASC, c.name;

