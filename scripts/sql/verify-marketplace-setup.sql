-- Verify Campaign Gift Card Configuration for AB6-1061
-- Run this to check if everything is set up correctly for call center lookup

-- ==========================================
-- STEP 1: Check if recipient exists
-- ==========================================
SELECT 
  'STEP 1: Recipient Check' as step,
  '✓ PASS' as status,
  id,
  redemption_code,
  first_name,
  last_name,
  audience_id,
  approval_status,
  phone,
  email
FROM recipients
WHERE UPPER(redemption_code) = 'AB6-1061';

-- ==========================================
-- STEP 2: Check if audience exists and has campaign
-- ==========================================
SELECT 
  'STEP 2: Audience & Campaign Check' as step,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL - No campaign linked' END as status,
  c.id as campaign_id,
  c.name as campaign_name,
  c.status as campaign_status,
  c.client_id,
  a.id as audience_id,
  a.name as audience_name
FROM campaigns c
INNER JOIN audiences a ON c.audience_id = a.id
WHERE a.id IN (
  SELECT audience_id FROM recipients 
  WHERE UPPER(redemption_code) = 'AB6-1061'
)
GROUP BY c.id, c.name, c.status, c.client_id, a.id, a.name;

-- ==========================================
-- STEP 3: Check if campaign has conditions
-- ==========================================
SELECT 
  'STEP 3: Campaign Conditions Check' as step,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL - No conditions configured' END as status,
  cc.id,
  cc.campaign_id,
  cc.condition_number,
  cc.condition_name,
  cc.trigger_type,
  cc.is_active
FROM campaign_conditions cc
WHERE cc.campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE c.audience_id IN (
    SELECT audience_id FROM recipients 
    WHERE UPPER(redemption_code) = 'AB6-1061'
  )
)
GROUP BY cc.id, cc.campaign_id, cc.condition_number, cc.condition_name, cc.trigger_type, cc.is_active;

-- ==========================================
-- STEP 4: Check if campaign has gift card config (CRITICAL for marketplace)
-- ==========================================
SELECT 
  'STEP 4: Gift Card Config Check' as step,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '✗ FAIL - No gift card configured!' END as status,
  gc.id,
  gc.campaign_id,
  gc.condition_number,
  gc.brand_id,
  gc.denomination,
  gb.name as brand_name
FROM campaign_gift_card_config gc
INNER JOIN gift_card_brands gb ON gc.brand_id = gb.id
WHERE gc.campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE c.audience_id IN (
    SELECT audience_id FROM recipients 
    WHERE UPPER(redemption_code) = 'AB6-1061'
  )
)
GROUP BY gc.id, gc.campaign_id, gc.condition_number, gc.brand_id, gc.denomination, gb.name;

-- ==========================================
-- STEP 5: Check if client has access to gift cards
-- ==========================================
SELECT 
  'STEP 5: Client Gift Card Access Check' as step,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '⚠ WARNING - Client may need to purchase gift cards' END as status,
  cl.name as client_name,
  gb.name as brand_name,
  cag.denomination,
  cag.is_enabled
FROM client_available_gift_cards cag
INNER JOIN clients cl ON cag.client_id = cl.id
INNER JOIN gift_card_brands gb ON cag.brand_id = gb.id
WHERE cag.client_id IN (
  SELECT client_id FROM campaigns
  WHERE audience_id IN (
    SELECT audience_id FROM recipients 
    WHERE UPPER(redemption_code) = 'AB6-1061'
  )
)
GROUP BY cl.name, gb.name, cag.denomination, cag.is_enabled;

-- ==========================================
-- STEP 6: Check if inventory has available cards
-- ==========================================
SELECT 
  'STEP 6: Gift Card Inventory Check' as step,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS' ELSE '⚠ WARNING - No available inventory' END as status,
  gb.name as brand_name,
  gi.denomination,
  COUNT(*) as available_cards,
  MIN(gi.uploaded_at) as oldest_card_date
FROM gift_card_inventory gi
INNER JOIN gift_card_brands gb ON gi.brand_id = gb.id
WHERE gi.status = 'available'
  AND EXISTS (
    SELECT 1 FROM campaign_gift_card_config gc
    WHERE gc.brand_id = gi.brand_id
      AND gc.denomination = gi.denomination
      AND gc.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.audience_id IN (
          SELECT audience_id FROM recipients 
          WHERE UPPER(redemption_code) = 'AB6-1061'
        )
      )
  )
GROUP BY gb.name, gi.denomination;

-- ==========================================
-- STEP 7: Test the EXACT query call center uses
-- ==========================================
SELECT 
  'STEP 7: Exact Call Center Query Test' as step,
  CASE WHEN COUNT(*) > 0 THEN '✓ PASS - Lookup will work!' ELSE '✗ FAIL - Lookup will fail!' END as status,
  r.id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  a.id as audience_id,
  a.name as audience_name,
  c.id as campaign_id,
  c.name as campaign_name
FROM recipients r
INNER JOIN audiences a ON r.audience_id = a.id
INNER JOIN campaigns c ON c.audience_id = a.id
WHERE UPPER(r.redemption_code) = 'AB6-1061'
GROUP BY r.id, r.redemption_code, r.first_name, r.last_name, a.id, a.name, c.id, c.name;

-- ==========================================
-- FINAL SUMMARY
-- ==========================================
SELECT 
  '========== SUMMARY ==========' as section,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM recipients WHERE UPPER(redemption_code) = 'AB6-1061')
    THEN '✗ CRITICAL: Recipient does not exist'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.audience_id IN (SELECT audience_id FROM recipients WHERE UPPER(redemption_code) = 'AB6-1061')
    )
    THEN '✗ CRITICAL: No campaign linked to audience'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM campaign_gift_card_config gc
      WHERE gc.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.audience_id IN (SELECT audience_id FROM recipients WHERE UPPER(redemption_code) = 'AB6-1061')
      )
    )
    THEN '✗ CRITICAL: No gift card configured for campaign - RUN SETUP SCRIPT!'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM gift_card_inventory gi
      WHERE gi.status = 'available'
        AND EXISTS (
          SELECT 1 FROM campaign_gift_card_config gc
          WHERE gc.brand_id = gi.brand_id
            AND gc.denomination = gi.denomination
            AND gc.campaign_id IN (
              SELECT c.id FROM campaigns c
              WHERE c.audience_id IN (SELECT audience_id FROM recipients WHERE UPPER(redemption_code) = 'AB6-1061')
            )
        )
    )
    THEN '⚠ WARNING: No inventory available - add gift cards to platform'
    
    ELSE '✓ SUCCESS: Call center lookup should work!'
  END as diagnosis,
  
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM campaign_gift_card_config gc
      WHERE gc.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.audience_id IN (SELECT audience_id FROM recipients WHERE UPPER(redemption_code) = 'AB6-1061')
      )
    )
    THEN 'Run: scripts/sql/setup-campaign-gift-card-config.sql'
    ELSE 'No action needed - system ready!'
  END as next_action;

