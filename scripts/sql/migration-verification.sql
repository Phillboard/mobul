-- =====================================================
-- DATABASE MIGRATION VERIFICATION SCRIPT
-- =====================================================
-- Run this script in Supabase SQL Editor to verify
-- which migrations have been applied and system state
-- =====================================================

-- Query 1: Check migration history
-- Shows which migrations have been applied
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 50;

-- Query 2: Verify core tables exist
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'campaigns',
  'recipients', 
  'audiences',
  'clients',
  'users',
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
  'comments'
)
ORDER BY table_name;

-- Query 3: Check for critical functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'has_role',
  'user_can_access_client',
  'update_updated_at_column'
)
ORDER BY routine_name;

-- Query 4: Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE '%_legacy%'
ORDER BY tablename;

-- Query 5: Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
       pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Query 6: Count RLS policies
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count DESC;

-- Query 7: Check for error tracking tables (should exist after migration)
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'error_logs'
) as error_logs_exists,
EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'performance_metrics'
) as performance_metrics_exists,
EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'usage_analytics'
) as usage_analytics_exists;

-- Query 8: Check for tags and comments tables
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'tags'
) as tags_exists,
EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'comments'
) as comments_exists;

-- Query 9: Check indexes on critical tables
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND (
      tablename IN ('campaigns', 'recipients', 'events', 'call_sessions')
    )
ORDER BY
    tablename,
    indexname;

-- Query 10: Summary report
DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
  SELECT COUNT(*) INTO function_count FROM information_schema.routines WHERE routine_schema = 'public';
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
  SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE schemaname = 'public';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Public Tables: %', table_count;
  RAISE NOTICE 'Total Functions: %', function_count;
  RAISE NOTICE 'Total RLS Policies: %', policy_count;
  RAISE NOTICE 'Total Indexes: %', index_count;
  RAISE NOTICE '========================================';
END $$;


