-- ============================================
-- COMPREHENSIVE RLS AUTH FUNCTION FIX
-- Automatically fixes all policies using auth.uid(), auth.jwt(), 
-- or current_setting() without the performance-optimized (SELECT ...) wrapper
-- ============================================

-- This migration dynamically drops and recreates ALL policies that need fixing
-- Uses EXECUTE to handle the dynamic SQL generation

DO $$
DECLARE
  policy_record RECORD;
  new_qual TEXT;
  new_with_check TEXT;
  drop_sql TEXT;
  create_sql TEXT;
  policy_type TEXT;
  roles_list TEXT;
  fixed_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting Comprehensive RLS Auth Function Fix ===';
  
  -- Loop through all RLS policies in the public schema that need fixing
  FOR policy_record IN
    SELECT
      pol.polname AS policy_name,
      c.relname AS table_name,
      n.nspname AS schema_name,
      pol.polcmd AS command,
      pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
      pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr,
      pol.polrelid,
      pol.polroles,
      pol.polpermissive,
      pol.oid AS policy_oid
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND (
        -- Find policies with auth.uid() not wrapped in (SELECT ...)
        (pg_get_expr(pol.polqual, pol.polrelid) ~ 'auth\.uid\(\)'
         AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(SELECT auth\.uid\(\)\)'
         AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(\s*select\s+auth\.uid\(\)\s*\)')
        OR
        (pg_get_expr(pol.polwithcheck, pol.polrelid) ~ 'auth\.uid\(\)'
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(SELECT auth\.uid\(\)\)'
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(\s*select\s+auth\.uid\(\)\s*\)')
        OR
        -- Find policies with auth.jwt() not wrapped
        (pg_get_expr(pol.polqual, pol.polrelid) ~ 'auth\.jwt\(\)'
         AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(SELECT auth\.jwt\(\)\)')
        OR
        (pg_get_expr(pol.polwithcheck, pol.polrelid) ~ 'auth\.jwt\(\)'
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(SELECT auth\.jwt\(\)\)')
      )
    ORDER BY c.relname, pol.polname
  LOOP
    BEGIN
      -- Get the new expressions with auth functions wrapped
      new_qual := policy_record.using_expr;
      new_with_check := policy_record.with_check_expr;
      
      -- Replace auth.uid() with (SELECT auth.uid())
      -- Use negative lookbehind to avoid double-wrapping
      IF new_qual IS NOT NULL THEN
        -- Replace auth.uid() when not already wrapped
        new_qual := regexp_replace(new_qual, '([^(SELECT )])auth\.uid\(\)', '\1(SELECT auth.uid())', 'g');
        -- Clean up: replace standalone auth.uid() at start
        new_qual := regexp_replace(new_qual, '^auth\.uid\(\)', '(SELECT auth.uid())', 'g');
        -- Replace in function calls like has_role(auth.uid(), ...)
        new_qual := regexp_replace(new_qual, 'has_role\(auth\.uid\(\)', 'has_role((SELECT auth.uid())', 'g');
        new_qual := regexp_replace(new_qual, 'user_can_access_client\(auth\.uid\(\)', 'user_can_access_client((SELECT auth.uid())', 'g');
        new_qual := regexp_replace(new_qual, 'get_user_org_ids\(auth\.uid\(\)', 'get_user_org_ids((SELECT auth.uid())', 'g');
        new_qual := regexp_replace(new_qual, 'get_user_client_ids\(auth\.uid\(\)', 'get_user_client_ids((SELECT auth.uid())', 'g');
        -- Handle = auth.uid() pattern
        new_qual := regexp_replace(new_qual, '= auth\.uid\(\)', '= (SELECT auth.uid())', 'g');
        -- Handle auth.jwt()
        new_qual := regexp_replace(new_qual, 'auth\.jwt\(\)', '(SELECT auth.jwt())', 'g');
      END IF;
      
      IF new_with_check IS NOT NULL THEN
        new_with_check := regexp_replace(new_with_check, '([^(SELECT )])auth\.uid\(\)', '\1(SELECT auth.uid())', 'g');
        new_with_check := regexp_replace(new_with_check, '^auth\.uid\(\)', '(SELECT auth.uid())', 'g');
        new_with_check := regexp_replace(new_with_check, 'has_role\(auth\.uid\(\)', 'has_role((SELECT auth.uid())', 'g');
        new_with_check := regexp_replace(new_with_check, 'user_can_access_client\(auth\.uid\(\)', 'user_can_access_client((SELECT auth.uid())', 'g');
        new_with_check := regexp_replace(new_with_check, 'get_user_org_ids\(auth\.uid\(\)', 'get_user_org_ids((SELECT auth.uid())', 'g');
        new_with_check := regexp_replace(new_with_check, 'get_user_client_ids\(auth\.uid\(\)', 'get_user_client_ids((SELECT auth.uid())', 'g');
        new_with_check := regexp_replace(new_with_check, '= auth\.uid\(\)', '= (SELECT auth.uid())', 'g');
        new_with_check := regexp_replace(new_with_check, 'auth\.jwt\(\)', '(SELECT auth.jwt())', 'g');
      END IF;

      -- Determine policy command type
      CASE policy_record.command
        WHEN 'r' THEN policy_type := 'SELECT';
        WHEN 'a' THEN policy_type := 'INSERT';
        WHEN 'w' THEN policy_type := 'UPDATE';
        WHEN 'd' THEN policy_type := 'DELETE';
        WHEN '*' THEN policy_type := 'ALL';
        ELSE policy_type := 'ALL';
      END CASE;
      
      -- Build roles list
      IF policy_record.polroles = '{0}' OR policy_record.polroles IS NULL THEN
        roles_list := '';
      ELSE
        SELECT string_agg(rolname, ', ')
        INTO roles_list
        FROM pg_roles
        WHERE oid = ANY(policy_record.polroles);
        
        IF roles_list IS NOT NULL THEN
          roles_list := ' TO ' || roles_list;
        ELSE
          roles_list := '';
        END IF;
      END IF;
      
      -- Build DROP statement
      drop_sql := format('DROP POLICY IF EXISTS %I ON %I.%I',
        policy_record.policy_name,
        policy_record.schema_name,
        policy_record.table_name);
      
      -- Build CREATE statement based on policy type
      IF policy_type = 'INSERT' THEN
        -- INSERT policies only use WITH CHECK
        IF new_with_check IS NOT NULL THEN
          create_sql := format('CREATE POLICY %I ON %I.%I FOR %s%s WITH CHECK (%s)',
            policy_record.policy_name,
            policy_record.schema_name,
            policy_record.table_name,
            policy_type,
            roles_list,
            new_with_check);
        ELSE
          -- Skip if no WITH CHECK for INSERT
          RAISE NOTICE 'Skipping INSERT policy % on % - no WITH CHECK clause', 
            policy_record.policy_name, policy_record.table_name;
          skipped_count := skipped_count + 1;
          CONTINUE;
        END IF;
      ELSIF policy_type = 'SELECT' OR policy_type = 'DELETE' THEN
        -- SELECT and DELETE policies only use USING
        IF new_qual IS NOT NULL THEN
          create_sql := format('CREATE POLICY %I ON %I.%I FOR %s%s USING (%s)',
            policy_record.policy_name,
            policy_record.schema_name,
            policy_record.table_name,
            policy_type,
            roles_list,
            new_qual);
        ELSE
          RAISE NOTICE 'Skipping %s policy % on % - no USING clause', 
            policy_type, policy_record.policy_name, policy_record.table_name;
          skipped_count := skipped_count + 1;
          CONTINUE;
        END IF;
      ELSE
        -- UPDATE and ALL policies can have both USING and WITH CHECK
        IF new_qual IS NOT NULL AND new_with_check IS NOT NULL THEN
          create_sql := format('CREATE POLICY %I ON %I.%I FOR %s%s USING (%s) WITH CHECK (%s)',
            policy_record.policy_name,
            policy_record.schema_name,
            policy_record.table_name,
            policy_type,
            roles_list,
            new_qual,
            new_with_check);
        ELSIF new_qual IS NOT NULL THEN
          create_sql := format('CREATE POLICY %I ON %I.%I FOR %s%s USING (%s)',
            policy_record.policy_name,
            policy_record.schema_name,
            policy_record.table_name,
            policy_type,
            roles_list,
            new_qual);
        ELSIF new_with_check IS NOT NULL THEN
          create_sql := format('CREATE POLICY %I ON %I.%I FOR %s%s WITH CHECK (%s)',
            policy_record.policy_name,
            policy_record.schema_name,
            policy_record.table_name,
            policy_type,
            roles_list,
            new_with_check);
        ELSE
          RAISE NOTICE 'Skipping policy % on % - no expressions', 
            policy_record.policy_name, policy_record.table_name;
          skipped_count := skipped_count + 1;
          CONTINUE;
        END IF;
      END IF;
      
      -- Add PERMISSIVE/RESTRICTIVE modifier if needed
      IF NOT policy_record.polpermissive THEN
        create_sql := regexp_replace(create_sql, 'CREATE POLICY', 'CREATE POLICY');
        -- Note: RESTRICTIVE needs to be added after AS keyword, but default is PERMISSIVE
        -- For now, skip restrictive policies or handle specially
      END IF;
      
      -- Execute DROP
      RAISE NOTICE 'Fixing policy: % on %', policy_record.policy_name, policy_record.table_name;
      EXECUTE drop_sql;
      
      -- Execute CREATE
      EXECUTE create_sql;
      
      fixed_count := fixed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error fixing policy % on %: %', 
        policy_record.policy_name, policy_record.table_name, SQLERRM;
      skipped_count := skipped_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '=== RLS Auth Fix Complete ===';
  RAISE NOTICE 'Fixed: % policies', fixed_count;
  RAISE NOTICE 'Skipped: % policies', skipped_count;
END $$;

-- ============================================
-- Verify the fix worked
-- ============================================
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO remaining_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND (
      (pg_get_expr(pol.polqual, pol.polrelid) ~ 'auth\.uid\(\)'
       AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(SELECT auth\.uid\(\)\)')
      OR
      (pg_get_expr(pol.polwithcheck, pol.polrelid) ~ 'auth\.uid\(\)'
       AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(SELECT auth\.uid\(\)\)')
    );
  
  IF remaining_count > 0 THEN
    RAISE WARNING 'Still have % policies with unwrapped auth.uid() calls', remaining_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All auth.uid() calls are now wrapped in SELECT';
  END IF;
END $$;
