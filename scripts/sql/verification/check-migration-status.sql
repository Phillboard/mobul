-- =====================================================
-- DATABASE MIGRATION STATUS VERIFICATION
-- =====================================================
-- Run this in Supabase SQL Editor to check current state
-- Date: 2024-12-02
-- =====================================================

-- Query 1: Check migration history
-- This shows which migrations Supabase has tracked
SELECT version, name, inserted_at 
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 50;

-- Query 2: Verify core tables exist
SELECT 
  table_name, 
  table_type,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE columns.table_name = tables.table_name 
   AND columns.table_schema = 'public') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'campaigns',
  'recipients', 
  'audiences',
  'clients',
  'profiles',
  'user_roles',
  'call_sessions',
  'sms_opt_ins',
  'events',
  'campaign_conditions',
  'condition_triggers',
  'error_logs',
  'performance_metrics',
  'security_audit_log',
  'tags',
  'comments',
  'organizations',
  'agencies',
  'contact_lists',
  'tracked_phone_numbers'
)
ORDER BY table_name;

-- Query 3: Check for critical functions
SELECT 
  routine_name, 
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'has_role',
  'user_can_access_client',
  'update_updated_at_column',
  'check_rate_limit',
  'log_error'
)
ORDER BY routine_name;

-- Query 4: Verify RLS is enabled on all public tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '⚠️ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE '%_legacy%'
AND tablename NOT LIKE 'spatial_%'
ORDER BY rowsecurity, tablename;

-- Query 5: Check for tables that need RLS policies
SELECT 
  t.tablename,
  COUNT(p.policyname) as policy_count,
  CASE 
    WHEN COUNT(p.policyname) = 0 THEN '⚠️ NO POLICIES'
    WHEN COUNT(p.policyname) < 2 THEN '⚠️ FEW POLICIES'
    ELSE '✅ Has Policies'
  END as policy_status
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
AND t.tablename NOT LIKE '%_legacy%'
AND t.rowsecurity = true
GROUP BY t.tablename
ORDER BY policy_count, t.tablename;

-- Query 6: Check database size and largest tables
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Query 7: Check for missing indexes on foreign keys
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  CASE 
    WHEN i.indexname IS NULL THEN '⚠️ MISSING INDEX'
    ELSE '✅ Has Index: ' || i.indexname
  END as index_status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_indexes i 
  ON i.tablename = tc.table_name 
  AND i.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Query 8: Check for tables with no updated_at column
SELECT 
  table_name,
  '⚠️ Missing updated_at column' as issue
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = t.table_schema
  AND c.table_name = t.table_name
  AND c.column_name = 'updated_at'
)
AND table_name NOT LIKE '%_legacy%'
AND table_name NOT IN ('spatial_ref_sys', 'schema_migrations')
ORDER BY table_name;

-- Query 9: Summary Report
SELECT 
  'Total Tables' as metric,
  COUNT(*)::text as value
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  'Tables with RLS Enabled' as metric,
  COUNT(*)::text as value
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true

UNION ALL

SELECT 
  'Total Functions' as metric,
  COUNT(*)::text as value
FROM information_schema.routines
WHERE routine_schema = 'public'

UNION ALL

SELECT 
  'Total Indexes' as metric,
  COUNT(*)::text as value
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value;

-- =====================================================
-- ACTION ITEMS BASED ON RESULTS
-- =====================================================
-- 1. Review tables without RLS policies
-- 2. Add missing indexes on foreign keys
-- 3. Verify all critical functions exist
-- 4. Check if error_logs table exists (needed for monitoring)
-- 5. Verify tags and comments tables exist
-- =====================================================

