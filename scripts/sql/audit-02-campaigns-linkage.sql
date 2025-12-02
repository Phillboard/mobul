-- ============================================
-- DETAILED CAMPAIGN & LINKAGE ANALYSIS
-- Understanding campaign configuration and connections
-- ============================================

-- Check 1: Campaign-to-Audience linkage map
SELECT 
  '1. Campaign-Audience Linkage Map' as report_section,
  c.id as campaign_id,
  c.name as campaign_name,
  c.status as campaign_status,
  c.audience_id,
  a.name as linked_audience_name,
  
  -- Recipient metrics
  COUNT(DISTINCT r.id) as recipients_accessible,
  MIN(r.redemption_code) as first_code_example,
  MAX(r.redemption_code) as last_code_example,
  
  -- Configuration metrics
  COUNT(DISTINCT cc.id) as conditions_count,
  COUNT(DISTINCT gc.id) as gift_card_configs_count,
  
  -- Health check
  CASE 
    WHEN c.audience_id IS NULL THEN '❌ No audience linked'
    WHEN COUNT(DISTINCT r.id) = 0 THEN '❌ Audience linked but empty'
    WHEN COUNT(DISTINCT cc.id) = 0 THEN '❌ No conditions configured'
    WHEN COUNT(DISTINCT gc.id) = 0 THEN '❌ No gift cards configured'
    ELSE '✓ Fully configured'
  END as health_status
  
FROM campaigns c
LEFT JOIN audiences a ON a.id = c.audience_id
LEFT JOIN recipients r ON r.audience_id = c.audience_id
LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
GROUP BY c.id, c.name, c.status, c.audience_id, a.name
ORDER BY c.created_at DESC;

-- Check 2: Campaign conditions detail
SELECT 
  '2. Campaign Conditions Status' as report_section,
  c.name as campaign_name,
  cc.condition_number,
  cc.condition_name,
  cc.trigger_type,
  cc.is_active,
  
  -- Check if condition has gift card
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM campaign_gift_card_config gc
      WHERE gc.campaign_id = c.id AND gc.condition_number = cc.condition_number
    ) THEN '✓ Has gift card'
    ELSE '❌ No gift card'
  END as gift_card_status,
  
  -- Get gift card details
  gb.brand_name as gift_card_brand,
  gc.denomination as gift_card_value
  
FROM campaigns c
INNER JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id AND gc.condition_number = cc.condition_number
LEFT JOIN gift_card_brands gb ON gb.id = gc.brand_id
ORDER BY c.name, cc.condition_number;

-- Check 3: Which campaigns is "spring 2689" linked to?
SELECT 
  '3. Spring 2689 Campaign Details' as report_section,
  c.id as campaign_id,
  c.name,
  c.status,
  c.audience_id,
  a.name as audience_name,
  c.client_id,
  cl.name as client_name,
  
  -- Metrics
  (SELECT COUNT(*) FROM recipients WHERE audience_id = c.audience_id) as recipients_count,
  (SELECT COUNT(*) FROM campaign_conditions WHERE campaign_id = c.id) as conditions_count,
  (SELECT COUNT(*) FROM campaign_gift_card_config WHERE campaign_id = c.id) as gift_configs_count,
  
  -- Full status
  CASE 
    WHEN c.audience_id IS NULL THEN '❌ Not linked to audience'
    WHEN (SELECT COUNT(*) FROM recipients WHERE audience_id = c.audience_id) = 0 THEN '⚠ Linked but no recipients'
    WHEN (SELECT COUNT(*) FROM campaign_gift_card_config WHERE campaign_id = c.id) = 0 THEN '❌ No gift card configured'
    ELSE '✓ Ready'
  END as campaign_readiness
  
FROM campaigns c
LEFT JOIN audiences a ON a.id = c.audience_id
LEFT JOIN clients cl ON cl.id = c.client_id
WHERE c.name = 'spring 2689';

-- Check 4: Cross-reference campaigns and recipients
SELECT 
  '4. Can Any Campaign Find AB6-1061?' as report_section,
  c.name as campaign_name,
  c.audience_id as campaign_audience,
  r.audience_id as recipient_audience,
  CASE 
    WHEN c.audience_id = r.audience_id THEN '✓ MATCH - Lookup works'
    WHEN c.audience_id IS NULL THEN '❌ Campaign has no audience'
    WHEN r.audience_id IS NULL THEN '❌ Recipient has no audience'
    ELSE '❌ MISMATCH - Different audiences'
  END as match_status
FROM campaigns c
CROSS JOIN (SELECT * FROM recipients WHERE redemption_code = 'AB6-1061') r
WHERE c.client_id = (SELECT client_id FROM campaigns WHERE name = 'spring 2689')
ORDER BY match_status DESC;

-- Check 5: Import batch analysis
SELECT 
  '5. Import Batch Analysis' as report_section,
  DATE(created_at) as import_date,
  COUNT(*) as recipients_imported,
  COUNT(DISTINCT audience_id) as unique_audiences,
  COUNT(CASE WHEN audience_id IS NULL THEN 1 END) as orphaned_count,
  MIN(redemption_code) as first_code,
  MAX(redemption_code) as last_code
FROM recipients
GROUP BY DATE(created_at)
ORDER BY import_date DESC;

