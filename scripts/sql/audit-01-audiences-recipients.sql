-- ============================================
-- DETAILED AUDIENCE & RECIPIENT ANALYSIS
-- Understanding the contact/audience relationship
-- ============================================

-- Check 1: All audiences with their statistics
SELECT 
  '1. All Audiences' as report_section,
  a.id as audience_id,
  a.name as audience_name,
  a.client_id,
  cl.name as client_name,
  a.total_count as declared_size,
  COUNT(DISTINCT r.id) as actual_recipients,
  a.total_count - COUNT(DISTINCT r.id) as size_difference,
  COUNT(DISTINCT c.id) as campaigns_using_this_audience,
  a.created_at,
  CASE 
    WHEN COUNT(DISTINCT r.id) = 0 THEN '❌ Empty audience'
    WHEN a.total_count != COUNT(DISTINCT r.id) THEN '⚠ Count mismatch'
    WHEN COUNT(DISTINCT c.id) = 0 THEN '⚠ No campaigns use this'
    ELSE '✓ OK'
  END as status
FROM audiences a
LEFT JOIN recipients r ON r.audience_id = a.id
LEFT JOIN campaigns c ON c.audience_id = a.id
LEFT JOIN clients cl ON cl.id = a.client_id
GROUP BY a.id, a.name, a.client_id, cl.name, a.total_count, a.created_at
ORDER BY a.created_at DESC;

-- Check 2: Recipients by audience distribution
SELECT 
  '2. Recipient Distribution' as report_section,
  COALESCE(a.name, 'NO AUDIENCE (ORPHANED)') as audience_name,
  COUNT(*) as recipient_count,
  MIN(r.created_at) as oldest_recipient,
  MAX(r.created_at) as newest_recipient,
  COUNT(DISTINCT DATE(r.created_at)) as import_days,
  CASE 
    WHEN a.id IS NULL THEN '❌ CRITICAL: Orphaned'
    ELSE '✓ OK'
  END as status
FROM recipients r
LEFT JOIN audiences a ON a.id = r.audience_id
GROUP BY a.id, a.name
ORDER BY recipient_count DESC;

-- Check 3: Sample recipients from each audience
SELECT 
  '3. Sample Recipients by Audience' as report_section,
  a.name as audience_name,
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.created_at,
  ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY r.created_at) as row_num
FROM recipients r
LEFT JOIN audiences a ON a.id = r.audience_id
WHERE r.redemption_code IS NOT NULL
ORDER BY a.name, r.created_at
LIMIT 30;

-- Check 4: Orphaned recipients detail
SELECT 
  '4. Orphaned Recipients (First 20)' as report_section,
  redemption_code,
  first_name,
  last_name,
  email,
  phone,
  created_at,
  '❌ No audience assigned' as issue
FROM recipients
WHERE audience_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Check 5: AB6-1061 specific with full context
SELECT 
  '5. AB6-1061 Complete Analysis' as report_section,
  r.id as recipient_id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.email,
  r.phone,
  r.company,
  r.audience_id,
  a.name as audience_name,
  a.client_id,
  r.approval_status,
  r.sms_opt_in_status,
  r.created_at,
  
  -- What's wrong?
  CASE 
    WHEN r.audience_id IS NULL THEN '❌ PROBLEM: No audience assigned to this recipient'
    WHEN NOT EXISTS (SELECT 1 FROM campaigns WHERE audience_id = r.audience_id) 
      THEN '❌ PROBLEM: Audience exists but no campaign linked to it'
    ELSE '✓ Recipient properly configured'
  END as diagnosis
  
FROM recipients r
LEFT JOIN audiences a ON a.id = r.audience_id
WHERE r.redemption_code = 'AB6-1061';

-- Check 6: What audience should AB6-1061 be in?
SELECT 
  '6. Potential Target Audiences for AB6-1061' as report_section,
  a.id as audience_id,
  a.name as audience_name,
  COUNT(DISTINCT c.id) as campaigns_count,
  STRING_AGG(DISTINCT c.name, ', ') as campaign_names,
  COUNT(DISTINCT r.id) as current_recipient_count,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 THEN '✓ Has campaigns - good choice'
    ELSE '⚠ No campaigns linked'
  END as suitability
FROM audiences a
LEFT JOIN campaigns c ON c.audience_id = a.id
LEFT JOIN recipients r ON r.audience_id = a.id
WHERE a.client_id = (SELECT client_id FROM campaigns WHERE name = 'spring 2689')
GROUP BY a.id, a.name
ORDER BY campaigns_count DESC, current_recipient_count DESC;

