-- Diagnose and Fix Campaign Links
-- Run each section separately in Supabase SQL Editor
-- Date: 2025-12-18

-- =====================================================
-- STEP 1: See what audiences are orphaned (have recipients but no linked campaign)
-- =====================================================
SELECT 
  a.id as audience_id,
  a.name as audience_name,
  a.client_id,
  COUNT(r.id) as recipient_count,
  (SELECT COUNT(*) FROM campaigns c WHERE c.audience_id = a.id) as linked_campaigns
FROM audiences a
JOIN recipients r ON r.audience_id = a.id
WHERE r.campaign_id IS NULL
GROUP BY a.id, a.name, a.client_id
ORDER BY recipient_count DESC
LIMIT 20;

-- =====================================================
-- STEP 2: See what campaigns exist without audience_id
-- =====================================================
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.client_id,
  c.status,
  c.audience_id,
  c.created_at
FROM campaigns c
WHERE c.audience_id IS NULL
ORDER BY c.created_at DESC
LIMIT 20;

-- =====================================================
-- STEP 3: Try to find matching campaigns for orphaned audiences
-- This looks for campaigns with similar names or same client_id
-- =====================================================
SELECT 
  a.id as audience_id,
  a.name as audience_name,
  a.client_id as audience_client_id,
  c.id as potential_campaign_id,
  c.name as campaign_name,
  c.client_id as campaign_client_id,
  c.status,
  (SELECT COUNT(*) FROM recipients r WHERE r.audience_id = a.id) as recipient_count
FROM audiences a
LEFT JOIN campaigns c ON c.client_id = a.client_id AND c.audience_id IS NULL
WHERE a.id IN (
  SELECT DISTINCT r.audience_id 
  FROM recipients r 
  WHERE r.campaign_id IS NULL AND r.audience_id IS NOT NULL
)
ORDER BY a.name, c.created_at DESC
LIMIT 50;

-- =====================================================
-- STEP 4: Direct fix - Link campaigns to audiences by client_id and name pattern
-- This matches "X - Recipients" audiences to "X" campaigns
-- =====================================================
UPDATE campaigns c
SET audience_id = a.id
FROM audiences a
WHERE c.audience_id IS NULL
  AND c.client_id = a.client_id
  AND a.name = c.name || ' - Recipients';

-- Check result
SELECT 
  'After name pattern fix' as stage,
  COUNT(*) as total_campaigns,
  COUNT(audience_id) as with_audience_id
FROM campaigns;

-- =====================================================
-- STEP 5: If still orphaned, try looser matching
-- Match by extracting campaign name from audience name
-- =====================================================
UPDATE campaigns c
SET audience_id = a.id
FROM audiences a
WHERE c.audience_id IS NULL
  AND c.client_id = a.client_id
  AND a.name LIKE '%' || c.name || '%';

-- =====================================================
-- STEP 6: Now backfill recipients
-- =====================================================
UPDATE recipients r
SET campaign_id = c.id
FROM audiences a
JOIN campaigns c ON c.audience_id = a.id
WHERE r.audience_id = a.id
  AND r.campaign_id IS NULL;

-- Final verification
SELECT 
  'FINAL STATUS' as report,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as still_missing
FROM recipients;

-- =====================================================
-- STEP 7: If still orphaned, show what's left
-- =====================================================
SELECT 
  r.audience_id,
  a.name as audience_name,
  a.client_id,
  COUNT(*) as orphan_count,
  (SELECT c.name FROM campaigns c WHERE c.client_id = a.client_id LIMIT 1) as sample_campaign
FROM recipients r
LEFT JOIN audiences a ON a.id = r.audience_id
WHERE r.campaign_id IS NULL
GROUP BY r.audience_id, a.name, a.client_id
ORDER BY orphan_count DESC;
