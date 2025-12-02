-- ============================================
-- ENTERPRISE-GRADE COMPREHENSIVE SYSTEM AUDIT
-- Supabase SQL Editor Compatible Version
-- Gift Card Campaign Platform - Complete Analysis
-- ============================================

-- ==========================================
-- PHASE 1: DATA COMPLETENESS CHECK
-- ==========================================

SELECT 'PHASE 1: TABLE ROW COUNTS' as audit_phase, '========================================' as separator;

SELECT 'clients' as table_name, COUNT(*) as row_count, CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '❌' END as status FROM clients
UNION ALL
SELECT 'audiences', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '❌' END FROM audiences
UNION ALL
SELECT 'recipients', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '❌' END FROM recipients
UNION ALL
SELECT 'campaigns', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '❌' END FROM campaigns
UNION ALL
SELECT 'campaign_conditions', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '❌' END FROM campaign_conditions
UNION ALL
SELECT 'campaign_gift_card_config', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '❌' END FROM campaign_gift_card_config
UNION ALL
SELECT 'gift_card_brands', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '❌' END FROM gift_card_brands
UNION ALL
SELECT 'gift_card_inventory', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '⚠' ELSE '⚠' END FROM gift_card_inventory
UNION ALL
SELECT 'client_available_gift_cards', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '⚠' END FROM client_available_gift_cards
ORDER BY row_count DESC;

-- ==========================================
-- PHASE 2: RELATIONSHIP INTEGRITY CHECK
-- ==========================================

SELECT 'PHASE 2: ORPHANED RECORDS CHECK' as audit_phase, '========================================' as separator;

SELECT 
  'Orphaned Recipients (no audience)' as issue_type,
  COUNT(*) as problem_count,
  CASE WHEN COUNT(*) > 0 THEN '❌ CRITICAL' ELSE '✓ OK' END as status,
  CASE WHEN COUNT(*) > 0 THEN 'ACTION: Assign recipients to audience' ELSE 'No action needed' END as fix_action
FROM recipients 
WHERE audience_id IS NULL

UNION ALL

SELECT 
  'Campaigns Without Audiences' as issue_type,
  COUNT(*) as problem_count,
  CASE WHEN COUNT(*) > 0 THEN '❌ CRITICAL' ELSE '✓ OK' END as status,
  CASE WHEN COUNT(*) > 0 THEN 'ACTION: Link campaigns to audiences' ELSE 'No action needed' END
FROM campaigns 
WHERE audience_id IS NULL

UNION ALL

SELECT 
  'Campaigns Without Conditions' as issue_type,
  COUNT(*) as problem_count,
  CASE WHEN COUNT(*) > 0 THEN '⚠ WARNING' ELSE '✓ OK' END as status,
  CASE WHEN COUNT(*) > 0 THEN 'ACTION: Add campaign conditions' ELSE 'No action needed' END
FROM campaigns c
WHERE NOT EXISTS (SELECT 1 FROM campaign_conditions WHERE campaign_id = c.id)

UNION ALL

SELECT 
  'Campaigns Without Gift Cards' as issue_type,
  COUNT(*) as problem_count,
  CASE WHEN COUNT(*) > 0 THEN '❌ CRITICAL' ELSE '✓ OK' END as status,
  CASE WHEN COUNT(*) > 0 THEN 'ACTION: Configure gift cards for campaigns' ELSE 'No action needed' END
FROM campaigns c
WHERE NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id);

-- ==========================================
-- PHASE 3: AB6-1061 SPECIFIC ANALYSIS
-- ==========================================

SELECT 'PHASE 3: AB6-1061 ANALYSIS' as audit_phase, '========================================' as separator;

SELECT 
  'AB6-1061 Current State' as analysis_type,
  r.redemption_code,
  r.first_name || ' ' || r.last_name as customer_name,
  r.audience_id,
  a.name as audience_name,
  r.approval_status,
  CASE 
    WHEN r.audience_id IS NULL THEN '❌ PROBLEM: No audience assigned'
    ELSE '✓ Has audience: ' || COALESCE(a.name, 'Unknown')
  END as recipient_status
FROM recipients r
LEFT JOIN audiences a ON a.id = r.audience_id
WHERE r.redemption_code = 'AB6-1061';

-- ==========================================
-- PHASE 4: CAMPAIGN LOOKUP TEST
-- ==========================================

SELECT 'PHASE 4: CALL CENTER LOOKUP TEST' as audit_phase, '========================================' as separator;

SELECT 
  'Lookup Test for AB6-1061' as test_name,
  r.redemption_code,
  r.first_name || ' ' || r.last_name as customer_name,
  CASE WHEN r.audience_id IS NOT NULL THEN '✓' ELSE '❌' END as has_audience,
  CASE WHEN c.id IS NOT NULL THEN '✓' ELSE '❌' END as has_campaign,
  CASE WHEN gc.id IS NOT NULL THEN '✓' ELSE '❌' END as has_gift_card,
  CASE WHEN cc.id IS NOT NULL THEN '✓' ELSE '❌' END as has_conditions,
  
  -- Final verdict
  CASE 
    WHEN r.audience_id IS NULL THEN '❌ FAIL: Recipient has no audience'
    WHEN c.id IS NULL THEN '❌ FAIL: No campaign linked to audience'
    WHEN gc.id IS NULL THEN '❌ FAIL: No gift card configured'
    WHEN cc.id IS NULL THEN '❌ FAIL: No conditions'
    ELSE '✓ PASS: Lookup will work!'
  END as test_result,
  
  -- Show what was found
  a.name as audience_name,
  c.name as campaign_name,
  gb.brand_name as gift_card_brand,
  gc.denomination as gift_card_amount
  
FROM recipients r
LEFT JOIN audiences a ON r.audience_id = a.id
LEFT JOIN campaigns c ON c.audience_id = a.id
LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id AND cc.is_active = true
LEFT JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
LEFT JOIN gift_card_brands gb ON gb.id = gc.brand_id

WHERE UPPER(r.redemption_code) = 'AB6-1061';

-- ==========================================
-- PHASE 5: SPRING 2689 CAMPAIGN ANALYSIS
-- ==========================================

SELECT 'PHASE 5: SPRING 2689 CAMPAIGN STATUS' as audit_phase, '========================================' as separator;

SELECT 
  'Spring 2689 Details' as analysis_type,
  c.id as campaign_id,
  c.name as campaign_name,
  c.status,
  c.audience_id,
  a.name as audience_name,
  COALESCE((SELECT COUNT(*) FROM recipients WHERE audience_id = c.audience_id), 0) as recipients_accessible,
  COALESCE((SELECT COUNT(*) FROM campaign_conditions WHERE campaign_id = c.id), 0) as conditions_count,
  COALESCE((SELECT COUNT(*) FROM campaign_gift_card_config WHERE campaign_id = c.id), 0) as gift_configs_count,
  
  CASE 
    WHEN c.audience_id IS NULL THEN '❌ NO AUDIENCE LINKED'
    WHEN (SELECT COUNT(*) FROM recipients WHERE audience_id = c.audience_id) = 0 THEN '⚠ AUDIENCE EMPTY'
    WHEN (SELECT COUNT(*) FROM campaign_gift_card_config WHERE campaign_id = c.id) = 0 THEN '❌ NO GIFT CARD'
    ELSE '✓ READY'
  END as campaign_health
  
FROM campaigns c
LEFT JOIN audiences a ON a.id = c.audience_id
WHERE c.name = 'spring 2689';

-- ==========================================
-- PHASE 6: CAN SPRING 2689 FIND AB6-1061?
-- ==========================================

SELECT 'PHASE 6: LINKAGE CHECK' as audit_phase, '========================================' as separator;

SELECT 
  'Can Spring 2689 Find AB6-1061?' as question,
  r.redemption_code,
  r.audience_id as recipient_audience_id,
  c.audience_id as campaign_audience_id,
  CASE 
    WHEN r.audience_id IS NULL THEN '❌ Recipient has no audience'
    WHEN c.audience_id IS NULL THEN '❌ Campaign has no audience'
    WHEN r.audience_id = c.audience_id THEN '✓ YES - MATCH! Should work!'
    ELSE '❌ NO - MISMATCH (different audiences)'
  END as answer,
  a_r.name as recipient_in_audience,
  a_c.name as campaign_linked_to_audience
FROM 
  (SELECT * FROM recipients WHERE redemption_code = 'AB6-1061') r
CROSS JOIN 
  (SELECT * FROM campaigns WHERE name = 'spring 2689') c
LEFT JOIN audiences a_r ON a_r.id = r.audience_id
LEFT JOIN audiences a_c ON a_c.id = c.audience_id;

-- ==========================================
-- PHASE 7: ALL AUDIENCES OVERVIEW
-- ==========================================

SELECT 'PHASE 7: ALL AUDIENCES' as audit_phase, '========================================' as separator;

SELECT 
  a.id as audience_id,
  a.name as audience_name,
  a.total_count as declared_size,
  COUNT(DISTINCT r.id) as actual_recipients,
  COUNT(DISTINCT c.id) as campaigns_using_this,
  STRING_AGG(DISTINCT c.name, ', ') as campaign_names,
  CASE 
    WHEN COUNT(DISTINCT r.id) = 0 THEN '❌ Empty'
    WHEN COUNT(DISTINCT c.id) = 0 THEN '⚠ No campaigns'
    ELSE '✓ OK'
  END as status
FROM audiences a
LEFT JOIN recipients r ON r.audience_id = a.id
LEFT JOIN campaigns c ON c.audience_id = a.id
GROUP BY a.id, a.name, a.total_count
ORDER BY actual_recipients DESC;

-- ==========================================
-- PHASE 8: FINAL DIAGNOSIS & RECOMMENDATIONS
-- ==========================================

SELECT 'PHASE 8: FINAL DIAGNOSIS' as audit_phase, '========================================' as separator;

SELECT 
  -- Issue 1
  CASE 
    WHEN (SELECT COUNT(*) FROM recipients WHERE audience_id IS NULL) > 0
    THEN '❌ ISSUE 1: ' || (SELECT COUNT(*) FROM recipients WHERE audience_id IS NULL)::TEXT || ' recipients have no audience'
    ELSE '✓ OK: All recipients have audiences'
  END as issue_1,
  
  -- Issue 2
  CASE 
    WHEN (SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL) > 0
    THEN '❌ ISSUE 2: ' || (SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL)::TEXT || ' campaigns have no audience'
    ELSE '✓ OK: All campaigns linked to audiences'
  END as issue_2,
  
  -- Issue 3
  CASE 
    WHEN (SELECT COUNT(*) FROM campaigns c WHERE NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id)) > 0
    THEN '❌ ISSUE 3: ' || (SELECT COUNT(*) FROM campaigns c WHERE NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id))::TEXT || ' campaigns have no gift cards'
    ELSE '✓ OK: All campaigns have gift cards'
  END as issue_3,
  
  -- Issue 4 - AB6-1061 specific
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM recipients r
      INNER JOIN audiences a ON r.audience_id = a.id
      INNER JOIN campaigns c ON c.audience_id = a.id
      INNER JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
      WHERE r.redemption_code = 'AB6-1061'
    )
    THEN '✓ OK: AB6-1061 lookup will work'
    ELSE '❌ ISSUE 4: AB6-1061 CANNOT be found via campaign lookup'
  END as ab6_status,
  
  -- Recommended action
  CASE 
    WHEN (SELECT COUNT(*) FROM recipients WHERE audience_id IS NULL) > 0
    THEN '🔧 ACTION: Assign orphaned recipients to audiences'
    WHEN (SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL) > 0
    THEN '🔧 ACTION: Link campaigns to audiences'
    WHEN (SELECT COUNT(*) FROM campaigns c WHERE NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id)) > 0
    THEN '🔧 ACTION: Configure gift cards for campaigns'
    WHEN NOT EXISTS (
      SELECT 1 FROM recipients r
      INNER JOIN audiences a ON r.audience_id = a.id
      INNER JOIN campaigns c ON c.audience_id = a.id
      WHERE r.redemption_code = 'AB6-1061'
    )
    THEN '🔧 ACTION: Link AB6-1061''s audience to a campaign OR move AB6-1061 to campaign''s audience'
    ELSE '✅ SYSTEM READY: Test in call center!'
  END as recommended_action;

