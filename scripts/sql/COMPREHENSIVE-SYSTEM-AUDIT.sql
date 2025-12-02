-- COMPREHENSIVE SYSTEM AUDIT
-- Understanding Contacts, Audiences, Campaigns, and Recipients

-- ==========================================
-- PART 1: UNDERSTAND THE DATA MODEL
-- ==========================================

-- 1A. Check all recipients/contacts
SELECT 
  'PART 1A: Recipients Overview' as section,
  COUNT(*) as total_recipients,
  COUNT(DISTINCT audience_id) as unique_audiences,
  COUNT(CASE WHEN audience_id IS NULL THEN 1 END) as orphaned_recipients,
  COUNT(CASE WHEN audience_id IS NOT NULL THEN 1 END) as recipients_with_audience
FROM recipients;

-- 1B. Check all audiences
SELECT 
  'PART 1B: Audiences Overview' as section,
  a.id as audience_id,
  a.name as audience_name,
  a.client_id,
  a.total_count as declared_size,
  COUNT(r.id) as actual_recipients,
  c.name as client_name
FROM audiences a
LEFT JOIN recipients r ON r.audience_id = a.id
LEFT JOIN clients c ON c.id = a.client_id
GROUP BY a.id, a.name, a.client_id, a.total_count, c.name
ORDER BY a.created_at DESC;

-- 1C. Check all campaigns
SELECT 
  'PART 1C: Campaigns Overview' as section,
  c.id as campaign_id,
  c.name as campaign_name,
  c.status,
  c.audience_id,
  a.name as audience_name,
  COUNT(DISTINCT r.id) as recipients_via_audience,
  c.client_id,
  cl.name as client_name
FROM campaigns c
LEFT JOIN audiences a ON c.audience_id = a.id
LEFT JOIN recipients r ON r.audience_id = c.audience_id
LEFT JOIN clients cl ON cl.id = c.client_id
GROUP BY c.id, c.name, c.status, c.audience_id, a.name, c.client_id, cl.name
ORDER BY c.created_at DESC;

-- ==========================================
-- PART 2: IDENTIFY STRUCTURAL ISSUES
-- ==========================================

-- 2A. Orphaned recipients (no audience)
SELECT 
  'PART 2A: Orphaned Recipients' as section,
  redemption_code,
  first_name,
  last_name,
  email,
  phone,
  created_at
FROM recipients
WHERE audience_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 2B. Campaigns without audiences
SELECT 
  'PART 2B: Campaigns Without Audiences' as section,
  id,
  name,
  status,
  created_at
FROM campaigns
WHERE audience_id IS NULL
ORDER BY created_at DESC;

-- 2C. Empty audiences (declared but no recipients)
SELECT 
  'PART 2C: Empty Audiences' as section,
  a.id,
  a.name,
  a.total_count as declared_count,
  COUNT(r.id) as actual_count
FROM audiences a
LEFT JOIN recipients r ON r.audience_id = a.id
GROUP BY a.id, a.name, a.total_count
HAVING COUNT(r.id) = 0;

-- ==========================================
-- PART 3: CHECK CAMPAIGN CONFIGURATIONS
-- ==========================================

-- 3A. Gift card configuration status
SELECT 
  'PART 3A: Gift Card Config Status' as section,
  c.name as campaign_name,
  c.status,
  COUNT(DISTINCT gc.id) as gift_card_configs,
  COUNT(DISTINCT cc.id) as conditions_count,
  STRING_AGG(DISTINCT gb.brand_name, ', ') as brands
FROM campaigns c
LEFT JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN gift_card_brands gb ON gb.id = gc.brand_id
GROUP BY c.id, c.name, c.status
ORDER BY c.created_at DESC;

-- ==========================================
-- PART 4: AB6-1061 SPECIFIC ANALYSIS
-- ==========================================

-- 4A. Where is AB6-1061?
SELECT 
  'PART 4A: AB6-1061 Details' as section,
  r.id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.audience_id,
  a.name as audience_name,
  r.created_at,
  r.approval_status
FROM recipients r
LEFT JOIN audiences a ON r.audience_id = a.id
WHERE r.redemption_code = 'AB6-1061';

-- 4B. What campaigns could AB6-1061 belong to?
SELECT 
  'PART 4B: Possible Campaigns for AB6-1061' as section,
  c.id as campaign_id,
  c.name as campaign_name,
  c.status,
  c.audience_id,
  a.name as audience_name,
  COUNT(r.id) as total_recipients_in_campaign
FROM campaigns c
LEFT JOIN audiences a ON c.audience_id = a.id
LEFT JOIN recipients r ON r.audience_id = c.audience_id
WHERE c.client_id = (
  SELECT client_id FROM campaigns WHERE name = 'spring 2689' LIMIT 1
)
GROUP BY c.id, c.name, c.status, c.audience_id, a.name
ORDER BY c.created_at DESC;

-- ==========================================
-- PART 5: RELATIONSHIP ANALYSIS
-- ==========================================

-- 5A. Show the connection chain
SELECT 
  'PART 5A: Data Relationship Chain' as section,
  'Client -> Audience -> Recipients -> Campaign' as expected_flow,
  CASE 
    WHEN EXISTS (SELECT 1 FROM recipients WHERE audience_id IS NULL)
    THEN '❌ BROKEN: Some recipients have no audience'
    ELSE '✓ OK: All recipients have audiences'
  END as recipients_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM campaigns WHERE audience_id IS NULL)
    THEN '❌ BROKEN: Some campaigns have no audience'
    ELSE '✓ OK: All campaigns linked to audiences'
  END as campaigns_status;

-- ==========================================
-- PART 6: RECOMMENDED ACTIONS
-- ==========================================

SELECT 
  'PART 6: DIAGNOSIS & RECOMMENDATIONS' as section,
  CASE 
    -- Check if recipients are orphaned
    WHEN (SELECT COUNT(*) FROM recipients WHERE audience_id IS NULL) > 0
    THEN 'ISSUE 1: ' || (SELECT COUNT(*) FROM recipients WHERE audience_id IS NULL)::TEXT || ' recipients have no audience'
    ELSE 'OK: All recipients have audiences'
  END as issue_1,
  
  CASE 
    -- Check if campaigns are orphaned
    WHEN (SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL) > 0
    THEN 'ISSUE 2: ' || (SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL)::TEXT || ' campaigns have no audience'
    ELSE 'OK: All campaigns linked to audiences'
  END as issue_2,
  
  CASE 
    -- Check if AB6-1061 can be found via any campaign
    WHEN EXISTS (
      SELECT 1 FROM recipients r
      INNER JOIN audiences a ON r.audience_id = a.id
      INNER JOIN campaigns c ON c.audience_id = a.id
      WHERE r.redemption_code = 'AB6-1061'
    )
    THEN '✓ AB6-1061 is accessible via campaign lookup'
    ELSE '❌ AB6-1061 CANNOT be found via campaign lookup'
  END as ab6_status,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM recipients WHERE audience_id IS NULL) > 0
    THEN 'ACTION: Assign orphaned recipients to an audience'
    WHEN (SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL) > 0
    THEN 'ACTION: Link campaigns to their audiences'
    WHEN NOT EXISTS (
      SELECT 1 FROM recipients r
      INNER JOIN audiences a ON r.audience_id = a.id
      INNER JOIN campaigns c ON c.audience_id = a.id
      WHERE r.redemption_code = 'AB6-1061'
    )
    THEN 'ACTION: Move AB6-1061 to correct audience or link campaign properly'
    ELSE 'SYSTEM READY: Test the lookup'
  END as recommended_action;

