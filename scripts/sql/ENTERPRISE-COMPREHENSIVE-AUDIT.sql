-- ============================================
-- ENTERPRISE-GRADE COMPREHENSIVE SYSTEM AUDIT
-- Gift Card Campaign Platform - Complete Analysis
-- ============================================

SET search_path TO public;

-- ============================================
-- PHASE 1: DATA COMPLETENESS CHECK
-- ============================================

\echo '============================================'
\echo 'PHASE 1: DATA COMPLETENESS CHECK'
\echo '============================================'

SELECT 'PHASE 1.1: Table Row Counts' as audit_section;
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

-- ============================================
-- PHASE 2: RELATIONSHIP INTEGRITY CHECK
-- ============================================

\echo ''
\echo '============================================'
\echo 'PHASE 2: RELATIONSHIP INTEGRITY CHECK'
\echo '============================================'

SELECT 'PHASE 2.1: Orphaned Records' as audit_section;

SELECT 
  'Orphaned Recipients (no audience)' as issue_type,
  COUNT(*) as problem_count,
  CASE WHEN COUNT(*) > 0 THEN '❌ CRITICAL' ELSE '✓ OK' END as status,
  CASE WHEN COUNT(*) > 0 THEN 'Run: fix-orphaned-recipients.sql' ELSE 'No action needed' END as fix_action
FROM recipients 
WHERE audience_id IS NULL
UNION ALL
SELECT 
  'Invalid Recipient Audiences' as issue_type,
  COUNT(*) as problem_count,
  CASE WHEN COUNT(*) > 0 THEN '❌ CRITICAL' ELSE '✓ OK' END as status,
  CASE WHEN COUNT(*) > 0 THEN 'Clean up invalid references' ELSE 'No action needed' END
FROM recipients 
WHERE audience_id IS NOT NULL AND audience_id NOT IN (SELECT id FROM audiences)
UNION ALL
SELECT 
  'Campaigns Without Audiences' as issue_type,
  COUNT(*) as problem_count,
  CASE WHEN COUNT(*) > 0 THEN '❌ CRITICAL' ELSE '✓ OK' END as status,
  CASE WHEN COUNT(*) > 0 THEN 'Run: fix-campaign-links.sql' ELSE 'No action needed' END
FROM campaigns 
WHERE audience_id IS NULL
UNION ALL
SELECT 
  'Campaigns Without Conditions' as issue_type,
  COUNT(*) as problem_count,
  CASE WHEN COUNT(*) > 0 THEN '⚠ WARNING' ELSE '✓ OK' END as status,
  CASE WHEN COUNT(*) > 0 THEN 'Add campaign conditions' ELSE 'No action needed' END
FROM campaigns c
WHERE NOT EXISTS (SELECT 1 FROM campaign_conditions WHERE campaign_id = c.id)
UNION ALL
SELECT 
  'Campaigns Without Gift Cards' as issue_type,
  COUNT(*) as problem_count,
  CASE WHEN COUNT(*) > 0 THEN '❌ CRITICAL' ELSE '✓ OK' END as status,
  CASE WHEN COUNT(*) > 0 THEN 'Run: fix-gift-card-configs.sql' ELSE 'No action needed' END
FROM campaigns c
WHERE NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id);

-- ============================================
-- PHASE 3: DATA CONSISTENCY CHECK
-- ============================================

\echo ''
\echo '============================================'
\echo 'PHASE 3: DATA CONSISTENCY CHECK'
\echo '============================================'

SELECT 'PHASE 3.1: Audience Count Discrepancies' as audit_section;

SELECT 
  a.id,
  a.name as audience_name,
  a.total_count as declared_count,
  COUNT(r.id) as actual_recipients,
  a.total_count - COUNT(r.id) as discrepancy,
  CASE 
    WHEN a.total_count = COUNT(r.id) THEN '✓ OK'
    WHEN ABS(a.total_count - COUNT(r.id)) <= 5 THEN '⚠ Minor discrepancy'
    ELSE '❌ Major discrepancy'
  END as status
FROM audiences a
LEFT JOIN recipients r ON r.audience_id = a.id
GROUP BY a.id, a.name, a.total_count
ORDER BY ABS(a.total_count - COUNT(r.id)) DESC
LIMIT 10;

-- ============================================
-- PHASE 4: DUPLICATE DETECTION
-- ============================================

\echo ''
\echo '============================================'
\echo 'PHASE 4: DUPLICATE DETECTION'
\echo '============================================'

SELECT 'PHASE 4.1: Duplicate Redemption Codes' as audit_section;

SELECT 
  redemption_code,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as recipient_ids,
  '❌ CRITICAL - Codes must be unique' as status
FROM recipients
WHERE redemption_code IS NOT NULL
GROUP BY redemption_code
HAVING COUNT(*) > 1;

-- ============================================
-- PHASE 5: CAMPAIGN CONFIGURATION AUDIT
-- ============================================

\echo ''
\echo '============================================'
\echo 'PHASE 5: CAMPAIGN CONFIGURATION AUDIT'
\echo '============================================'

SELECT 'PHASE 5.1: Campaign Completeness Check' as audit_section;

SELECT 
  c.id,
  c.name as campaign_name,
  c.status,
  
  -- Audience check
  CASE WHEN c.audience_id IS NOT NULL THEN '✓' ELSE '❌' END as has_audience,
  
  -- Recipient count
  COALESCE((SELECT COUNT(*) FROM recipients WHERE audience_id = c.audience_id), 0) as recipient_count,
  
  -- Conditions check
  CASE WHEN EXISTS (SELECT 1 FROM campaign_conditions WHERE campaign_id = c.id) 
    THEN '✓' ELSE '❌' END as has_conditions,
  
  -- Gift card check
  CASE WHEN EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id) 
    THEN '✓' ELSE '❌' END as has_gift_card,
  
  -- Overall health
  CASE 
    WHEN c.audience_id IS NULL THEN '❌ NO AUDIENCE'
    WHEN NOT EXISTS (SELECT 1 FROM recipients WHERE audience_id = c.audience_id) 
      THEN '⚠ NO RECIPIENTS'
    WHEN NOT EXISTS (SELECT 1 FROM campaign_conditions WHERE campaign_id = c.id) 
      THEN '❌ NO CONDITIONS'
    WHEN NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id) 
      THEN '❌ NO GIFT CARD'
    ELSE '✓ COMPLETE'
  END as campaign_health
  
FROM campaigns c
ORDER BY 
  CASE campaign_health
    WHEN '✓ COMPLETE' THEN 4
    WHEN '⚠ NO RECIPIENTS' THEN 3
    WHEN '❌ NO CONDITIONS' THEN 2
    WHEN '❌ NO GIFT CARD' THEN 1
    ELSE 0
  END ASC,
  c.created_at DESC;

-- ============================================
-- PHASE 6: GIFT CARD CONFIGURATION VALIDATION
-- ============================================

\echo ''
\echo '============================================'
\echo 'PHASE 6: GIFT CARD CONFIGURATION'
\echo '============================================'

SELECT 'PHASE 6.1: Gift Card Config Health' as audit_section;

SELECT 
  c.name as campaign_name,
  gb.brand_name,
  gc.denomination,
  
  -- Brand status
  CASE WHEN gb.is_active THEN '✓ Active' ELSE '❌ Inactive' END as brand_status,
  
  -- Client access
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM client_available_gift_cards cag
      WHERE cag.client_id = c.client_id
        AND cag.brand_id = gc.brand_id
        AND cag.denomination = gc.denomination
        AND cag.is_enabled = true
    ) THEN '✓ Has Access'
    ELSE '❌ No Access'
  END as client_access,
  
  -- Inventory
  COALESCE((
    SELECT COUNT(*) FROM gift_card_inventory gi
    WHERE gi.brand_id = gc.brand_id
      AND gi.denomination = gc.denomination
      AND gi.status = 'available'
  ), 0) as available_inventory,
  
  -- Overall
  CASE 
    WHEN gb.is_active = false THEN '❌ Brand inactive'
    WHEN NOT EXISTS (
      SELECT 1 FROM client_available_gift_cards cag
      WHERE cag.client_id = c.client_id AND cag.brand_id = gc.brand_id
    ) THEN '❌ No client access'
    WHEN COALESCE((
      SELECT COUNT(*) FROM gift_card_inventory gi
      WHERE gi.brand_id = gc.brand_id AND gi.denomination = gc.denomination AND gi.status = 'available'
    ), 0) = 0 THEN '⚠ No inventory'
    ELSE '✓ READY'
  END as config_health
  
FROM campaigns c
INNER JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
INNER JOIN gift_card_brands gb ON gb.id = gc.brand_id
ORDER BY config_health ASC, c.name;

-- ============================================
-- PHASE 7: CALL CENTER LOOKUP TEST
-- ============================================

\echo ''
\echo '============================================'
\echo 'PHASE 7: CALL CENTER LOOKUP TEST'
\echo '============================================'

SELECT 'PHASE 7.1: Test Lookup for AB6-1061' as audit_section;

SELECT 
  r.redemption_code,
  r.first_name || ' ' || r.last_name as customer_name,
  r.phone,
  a.name as audience_name,
  c.name as campaign_name,
  gb.brand_name as gift_card_brand,
  gc.denomination as gift_card_amount,
  
  -- Status checks
  CASE WHEN r.audience_id IS NOT NULL THEN '✓' ELSE '❌' END as has_audience,
  CASE WHEN c.id IS NOT NULL THEN '✓' ELSE '❌' END as has_campaign,
  CASE WHEN gc.id IS NOT NULL THEN '✓' ELSE '❌' END as has_gift_card,
  
  -- Final verdict
  CASE 
    WHEN r.audience_id IS NULL THEN '❌ FAIL: Recipient has no audience'
    WHEN c.id IS NULL THEN '❌ FAIL: No campaign linked to audience'
    WHEN gc.id IS NULL THEN '❌ FAIL: No gift card configured'
    WHEN cc.id IS NULL THEN '❌ FAIL: No conditions'
    ELSE '✓ PASS: Lookup works!'
  END as test_result
  
FROM recipients r
LEFT JOIN audiences a ON r.audience_id = a.id
LEFT JOIN campaigns c ON c.audience_id = a.id
LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id AND cc.is_active = true
LEFT JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
LEFT JOIN gift_card_brands gb ON gb.id = gc.brand_id

WHERE UPPER(r.redemption_code) = 'AB6-1061';

-- ============================================
-- PHASE 8: SYSTEM-WIDE DIAGNOSIS
-- ============================================

\echo ''
\echo '============================================'
\echo 'PHASE 8: FINAL DIAGNOSIS & RECOMMENDATIONS'
\echo '============================================'

SELECT 'PHASE 8: COMPREHENSIVE DIAGNOSIS' as audit_section;

SELECT 
  -- Issue 1: Orphaned Recipients
  CASE 
    WHEN (SELECT COUNT(*) FROM recipients WHERE audience_id IS NULL) > 0
    THEN '❌ ISSUE 1: ' || (SELECT COUNT(*) FROM recipients WHERE audience_id IS NULL)::TEXT || ' recipients have no audience'
    ELSE '✓ OK: All recipients have audiences'
  END as issue_1,
  
  -- Issue 2: Campaigns without audiences
  CASE 
    WHEN (SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL) > 0
    THEN '❌ ISSUE 2: ' || (SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL)::TEXT || ' campaigns have no audience'
    ELSE '✓ OK: All campaigns linked to audiences'
  END as issue_2,
  
  -- Issue 3: Campaigns without gift cards
  CASE 
    WHEN (SELECT COUNT(*) FROM campaigns c WHERE NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id)) > 0
    THEN '❌ ISSUE 3: ' || (SELECT COUNT(*) FROM campaigns c WHERE NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id))::TEXT || ' campaigns have no gift cards'
    ELSE '✓ OK: All campaigns have gift cards'
  END as issue_3,
  
  -- Issue 4: AB6-1061 specific
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
    THEN 'CRITICAL ACTION: Run fix-orphaned-recipients.sql to assign audiences'
    WHEN (SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL) > 0
    THEN 'CRITICAL ACTION: Run fix-campaign-links.sql to link campaigns'
    WHEN (SELECT COUNT(*) FROM campaigns c WHERE NOT EXISTS (SELECT 1 FROM campaign_gift_card_config WHERE campaign_id = c.id)) > 0
    THEN 'CRITICAL ACTION: Run fix-gift-card-configs.sql'
    WHEN NOT EXISTS (
      SELECT 1 FROM recipients r
      INNER JOIN audiences a ON r.audience_id = a.id
      INNER JOIN campaigns c ON c.audience_id = a.id
      WHERE r.redemption_code = 'AB6-1061'
    )
    THEN 'CRITICAL ACTION: Link AB6-1061 to campaign audience'
    ELSE '✓ SYSTEM READY: Test in call center'
  END as recommended_action;

\echo ''
\echo '============================================'
\echo 'AUDIT COMPLETE'
\echo '============================================'

