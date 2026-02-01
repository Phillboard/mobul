-- Migration: Set search_path on all public functions
-- Issue: Functions without explicit search_path are vulnerable to search path attacks
-- Solution: Set search_path = public on all functions

-- ============================================
-- Dynamic approach: Update all functions in public schema
-- ============================================
DO $$
DECLARE
  func_record RECORD;
  alter_stmt TEXT;
BEGIN
  -- Loop through all functions in public schema that don't have search_path set
  FOR func_record IN 
    SELECT 
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS func_args,
      p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'  -- Only functions, not procedures
      -- Exclude system functions and those already with search_path
      AND p.proname NOT LIKE 'pg_%'
      AND p.proname NOT LIKE 'uuid_%'
  LOOP
    BEGIN
      -- Construct and execute ALTER FUNCTION statement
      alter_stmt := format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public',
        func_record.func_name,
        func_record.func_args
      );
      EXECUTE alter_stmt;
      RAISE NOTICE 'Set search_path for: %', func_record.func_name;
    EXCEPTION WHEN OTHERS THEN
      -- Log but continue if a specific function fails
      RAISE NOTICE 'Could not set search_path for %.%: %', 
        'public', func_record.func_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Function search_path migration completed';
END $$;
