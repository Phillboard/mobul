-- Comprehensive Diagnostic for AB6-1061 System Fix
-- Run this to understand the current state

-- ==========================================
-- SECTION 1: Contact Analysis
-- ==========================================
SELECT 
  '1. Contact Details' as section,
  r.id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.audience_id,
  r.approval_status,
  a.name as audience_name,
  a.client_id
FROM recipients r
LEFT JOIN audiences a ON r.audience_id = a.id
WHERE r.redemption_code = 'AB6-1061';

-- ==========================================
-- SECTION 2: All Audiences
-- ==========================================
SELECT 
  '2. All Audiences' as section,
  a.id,
  a.name,
  a.client_id,
  a.size,
  COUNT(r.id) as actual_contact_count
FROM audiences a
LEFT JOIN recipients r ON r.audience_id = a.id
GROUP BY a.id, a.name, a.client_id, a.size
ORDER BY a.created_at DESC;

-- ==========================================
-- SECTION 3: All Campaigns and Their Audiences
-- ==========================================
SELECT 
  '3. Campaigns & Audience Links' as section,
  c.id as campaign_id,
  c.name as campaign_name,
  c.status,
  c.audience_id,
  a.name as audience_name,
  a.size as audience_size,
  COUNT(DISTINCT r.id) as actual_recipients
FROM campaigns c
LEFT JOIN audiences a ON c.audience_id = a.id
LEFT JOIN recipients r ON r.audience_id = c.audience_id
GROUP BY c.id, c.name, c.status, c.audience_id, a.name, a.size
ORDER BY c.created_at DESC;

-- ==========================================
-- SECTION 4: Contacts Without Audience
-- ==========================================
SELECT 
  '4. Orphaned Contacts (No Audience)' as section,
  COUNT(*) as orphaned_count,
  MIN(redemption_code) as first_code_example,
  MAX(redemption_code) as last_code_example
FROM recipients
WHERE audience_id IS NULL;

-- ==========================================
-- SECTION 5: Campaign Gift Card Config Status
-- ==========================================
SELECT 
  '5. Gift Card Configs' as section,
  c.name as campaign_name,
  c.audience_id,
  gc.brand_id,
  gc.denomination,
  gc.condition_number,
  gb.name as brand_name
FROM campaigns c
LEFT JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
LEFT JOIN gift_card_brands gb ON gb.id = gc.brand_id
ORDER BY c.created_at DESC;

-- ==========================================
-- SECTION 6: Campaign Conditions
-- ==========================================
SELECT 
  '6. Campaign Conditions' as section,
  c.name as campaign_name,
  cc.condition_number,
  cc.condition_name,
  cc.trigger_type,
  cc.is_active
FROM campaigns c
LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id
ORDER BY c.created_at DESC, cc.condition_number;

-- ==========================================
-- SECTION 7: Recommended Action
-- ==========================================
SELECT 
  '7. DIAGNOSIS & ACTION' as section,
  CASE 
    WHEN (SELECT audience_id FROM recipients WHERE redemption_code = 'AB6-1061') IS NULL
    THEN '❌ CRITICAL: Contact has no audience_id - assign audience first!'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM campaigns 
      WHERE audience_id = (SELECT audience_id FROM recipients WHERE redemption_code = 'AB6-1061')
    )
    THEN '❌ CRITICAL: No campaign linked to contact''s audience - link campaign!'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM campaign_gift_card_config gc
      WHERE gc.campaign_id IN (
        SELECT id FROM campaigns 
        WHERE audience_id = (SELECT audience_id FROM recipients WHERE redemption_code = 'AB6-1061')
      )
    )
    THEN '⚠ WARNING: Campaign linked but no gift card configured - run setup script!'
    
    ELSE '✓ SUCCESS: System should work - check permissions'
  END as diagnosis,
  
  CASE 
    WHEN (SELECT audience_id FROM recipients WHERE redemption_code = 'AB6-1061') IS NULL
    THEN 'ACTION: Run fix_orphaned_contacts script'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM campaigns 
      WHERE audience_id = (SELECT audience_id FROM recipients WHERE redemption_code = 'AB6-1061')
    )
    THEN 'ACTION: Run link_campaign_to_audience script'
    
    ELSE 'ACTION: Run setup_gift_card_config script'
  END as recommended_action;

