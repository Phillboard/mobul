-- MVP Database Verification Script
-- This script checks all critical tables and data needed for campaign MVP

-- ============================================================================
-- SECTION 1: Core Tables Verification
-- ============================================================================

-- Check if all critical tables exist
SELECT 
  'TABLE_CHECK' as check_type,
  table_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = t.name
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES
  ('organizations'),
  ('clients'),
  ('users'),
  ('user_roles'),
  ('client_users'),
  ('campaigns'),
  ('audiences'),
  ('recipients'),
  ('campaign_conditions'),
  ('campaign_reward_configs'),
  ('gift_card_brands'),
  ('gift_card_pools'),
  ('gift_cards'),
  ('gift_card_deliveries'),
  ('contacts'),
  ('contact_lists'),
  ('contact_list_members'),
  ('landing_pages'),
  ('templates'),
  ('tracked_phone_numbers'),
  ('call_sessions')
) AS t(name);

-- ============================================================================
-- SECTION 2: Data Verification
-- ============================================================================

-- Check Organizations
SELECT 
  'ORGANIZATIONS' as entity,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END as status
FROM organizations;

-- Check Clients
SELECT 
  'CLIENTS' as entity,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END as status
FROM clients;

-- Check Users with Roles
SELECT 
  'USERS_WITH_ROLES' as entity,
  COUNT(DISTINCT ur.user_id) as count,
  CASE WHEN COUNT(DISTINCT ur.user_id) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END as status
FROM user_roles ur;

-- Check Client User Assignments
SELECT 
  'CLIENT_USER_ASSIGNMENTS' as entity,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END as status
FROM client_users;

-- ============================================================================
-- SECTION 3: Gift Card Infrastructure
-- ============================================================================

-- Check Gift Card Brands
SELECT 
  'GIFT_CARD_BRANDS' as entity,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ NEED TO SEED' END as status
FROM gift_card_brands;

-- Check Gift Card Pools
SELECT 
  'GIFT_CARD_POOLS' as entity,
  COUNT(*) as total_pools,
  SUM(available_cards) as total_available_cards,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ NO POOLS'
    WHEN SUM(available_cards) = 0 THEN '⚠️ NO AVAILABLE CARDS'
    ELSE '✅ READY'
  END as status
FROM gift_card_pools;

-- Check Gift Cards by Status
SELECT 
  'GIFT_CARDS_BY_STATUS' as entity,
  status,
  COUNT(*) as count
FROM gift_cards
GROUP BY status
ORDER BY status;

-- ============================================================================
-- SECTION 4: Contact & Campaign Setup
-- ============================================================================

-- Check Contacts
SELECT 
  'CONTACTS' as entity,
  COUNT(*) as count,
  COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END as status
FROM contacts;

-- Check Contact Lists
SELECT 
  'CONTACT_LISTS' as entity,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END as status
FROM contact_lists;

-- Check Templates
SELECT 
  'TEMPLATES' as entity,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END as status
FROM templates;

-- Check Campaigns
SELECT 
  'CAMPAIGNS' as entity,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM campaigns;

-- ============================================================================
-- SECTION 5: Detailed Status Report
-- ============================================================================

-- Campaign with Conditions and Rewards
SELECT 
  'CAMPAIGNS_WITH_REWARDS' as check_type,
  c.name as campaign_name,
  c.status,
  COUNT(DISTINCT cc.id) as conditions_count,
  COUNT(DISTINCT crc.id) as reward_configs_count,
  CASE 
    WHEN COUNT(DISTINCT cc.id) = 0 THEN '⚠️ NO CONDITIONS'
    WHEN COUNT(DISTINCT crc.id) = 0 THEN '⚠️ NO REWARDS'
    ELSE '✅ CONFIGURED'
  END as status_check
FROM campaigns c
LEFT JOIN campaign_conditions cc ON c.id = cc.campaign_id
LEFT JOIN campaign_reward_configs crc ON c.id = crc.campaign_id
GROUP BY c.id, c.name, c.status
LIMIT 10;

-- ============================================================================
-- SECTION 6: Critical Functions Check
-- ============================================================================

-- Check if required database functions exist
SELECT 
  'FUNCTION_CHECK' as check_type,
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'user_can_access_client',
    'has_role',
    'claim_available_card'
  )
ORDER BY routine_name;

-- ============================================================================
-- SECTION 7: MVP Readiness Summary
-- ============================================================================

-- Overall MVP Readiness Check
SELECT 
  '🎯 MVP READINESS SUMMARY' as summary,
  (SELECT COUNT(*) FROM clients) as clients_count,
  (SELECT COUNT(*) FROM user_roles) as users_with_roles,
  (SELECT COUNT(*) FROM gift_card_pools WHERE available_cards > 0) as pools_with_cards,
  (SELECT COUNT(*) FROM contacts) as contacts_count,
  (SELECT COUNT(*) FROM contact_lists) as contact_lists_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM clients) = 0 THEN '❌ Need to create client'
    WHEN (SELECT COUNT(*) FROM gift_card_pools WHERE available_cards > 0) = 0 THEN '❌ Need gift card pool with cards'
    WHEN (SELECT COUNT(*) FROM contacts) = 0 THEN '❌ Need to add contacts'
    ELSE '✅ READY TO CREATE CAMPAIGN'
  END as mvp_status;

