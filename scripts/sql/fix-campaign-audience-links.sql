-- Fix Campaign-Audience Links and Backfill campaign_id
-- Run this in Supabase SQL Editor
-- Date: 2025-12-18

-- =====================================================
-- STEP 1: DIAGNOSE THE PROBLEM
-- =====================================================

-- Check how many campaigns have audience_id set
SELECT 
  'CAMPAIGNS AUDIT' as report_type,
  COUNT(*) as total_campaigns,
  COUNT(audience_id) as with_audience_id,
  COUNT(*) - COUNT(audience_id) as missing_audience_id
FROM campaigns;

-- Check campaigns that SHOULD have audiences (have recipients via their audience)
-- This finds campaigns where audience.name matches the campaign pattern
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.audience_id as current_audience_id,
  a.id as matching_audience_id,
  a.name as audience_name,
  (SELECT COUNT(*) FROM recipients r WHERE r.audience_id = a.id) as recipient_count
FROM campaigns c
LEFT JOIN audiences a ON 
  a.name LIKE c.name || '%' OR 
  a.name LIKE '%' || c.name || '%' OR
  c.name LIKE a.name || '%'
WHERE c.audience_id IS NULL
  AND a.id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 20;

-- =====================================================
-- STEP 2: FIX CAMPAIGN -> AUDIENCE LINKS
-- =====================================================

-- Method 1: Link campaigns to audiences by matching names
-- Many campaigns have audiences named "{campaign_name} - Recipients"
UPDATE campaigns c
SET audience_id = a.id
FROM audiences a
WHERE c.audience_id IS NULL
  AND (
    a.name = c.name || ' - Recipients' OR
    a.name LIKE c.name || '%'
  );

-- Check how many campaigns were fixed
SELECT 
  'AFTER CAMPAIGN FIX' as report_type,
  COUNT(*) as total_campaigns,
  COUNT(audience_id) as with_audience_id,
  COUNT(*) - COUNT(audience_id) as missing_audience_id
FROM campaigns;

-- =====================================================
-- STEP 3: BACKFILL RECIPIENTS campaign_id
-- =====================================================

-- Now that campaigns have audience_id, backfill recipients
UPDATE recipients r
SET campaign_id = subq.campaign_id
FROM (
  SELECT DISTINCT ON (r2.id) 
    r2.id as recipient_id,
    c.id as campaign_id
  FROM recipients r2
  JOIN audiences a ON a.id = r2.audience_id
  JOIN campaigns c ON c.audience_id = a.id
  WHERE r2.campaign_id IS NULL
  ORDER BY r2.id, 
    CASE c.status 
      WHEN 'mailed' THEN 1 
      WHEN 'in_production' THEN 2 
      WHEN 'scheduled' THEN 3 
      ELSE 4 
    END,
    c.created_at DESC
) subq
WHERE r.id = subq.recipient_id
  AND r.campaign_id IS NULL;

-- =====================================================
-- STEP 4: VERIFY RESULTS
-- =====================================================

SELECT 
  'FINAL RECIPIENTS STATUS' as report_type,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as still_missing
FROM recipients;

-- Show remaining orphans (if any)
SELECT 
  r.id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.audience_id,
  a.name as audience_name,
  (SELECT COUNT(*) FROM campaigns c WHERE c.audience_id = a.id) as campaigns_for_audience
FROM recipients r
LEFT JOIN audiences a ON a.id = r.audience_id
WHERE r.campaign_id IS NULL
ORDER BY r.created_at DESC
LIMIT 20;
