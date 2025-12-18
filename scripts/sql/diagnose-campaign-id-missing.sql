-- Diagnostic Script: Check campaign_id status on recipients
-- Run this in Supabase SQL Editor to understand the current state
-- Date: 2025-12-18

-- 1. Overall statistics
SELECT 
  'SUMMARY' as report_type,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id,
  ROUND(100.0 * COUNT(campaign_id) / NULLIF(COUNT(*), 0), 2) as percent_complete
FROM recipients;

-- 2. Check recipients that SHOULD have campaign_id but don't
-- These are recipients with audience_id where the audience is linked to a campaign
SELECT 
  'FIXABLE VIA AUDIENCE' as report_type,
  COUNT(DISTINCT r.id) as recipient_count
FROM recipients r
JOIN audiences a ON a.id = r.audience_id
JOIN campaigns c ON c.audience_id = a.id
WHERE r.campaign_id IS NULL;

-- 3. Sample of affected recipients (for verification)
SELECT 
  r.id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.audience_id,
  a.name as audience_name,
  c.id as should_be_campaign_id,
  c.name as campaign_name,
  c.status as campaign_status
FROM recipients r
JOIN audiences a ON a.id = r.audience_id
JOIN campaigns c ON c.audience_id = a.id
WHERE r.campaign_id IS NULL
LIMIT 20;

-- 4. Check for recipients with contact_id that should be linked
SELECT 
  'RECIPIENTS WITH CONTACT_ID' as report_type,
  COUNT(*) as total_with_contact,
  SUM(CASE WHEN r.campaign_id IS NULL THEN 1 ELSE 0 END) as missing_campaign_id
FROM recipients r
WHERE r.contact_id IS NOT NULL;
