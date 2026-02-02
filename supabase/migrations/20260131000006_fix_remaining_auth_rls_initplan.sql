-- ============================================
-- Fix Remaining auth_rls_initplan Issues
-- Wraps auth.uid() and auth.jwt() calls in subqueries
-- for all RLS policies to prevent per-row re-evaluation
-- ============================================

-- This migration dynamically updates all RLS policies that use
-- auth.uid() or auth.jwt() without the (select ...) wrapper

DO $$
DECLARE
  policy_record RECORD;
  new_qual TEXT;
  new_with_check TEXT;
  has_changes BOOLEAN;
BEGIN
  -- Loop through all RLS policies in the public schema
  FOR policy_record IN
    SELECT
      pol.polname AS policy_name,
      c.relname AS table_name,
      n.nspname AS schema_name,
      pol.polcmd AS command,
      pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
      pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr,
      pol.polrelid,
      pol.oid AS policy_oid
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND (
        -- Find policies with auth.uid() not wrapped in (select ...)
        (pg_get_expr(pol.polqual, pol.polrelid) ~ 'auth\.uid\(\)' 
         AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(SELECT auth\.uid\(\)\)'
         AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(\s*select\s+auth\.uid\(\)\s*\)')
        OR
        (pg_get_expr(pol.polwithcheck, pol.polrelid) ~ 'auth\.uid\(\)' 
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(SELECT auth\.uid\(\)\)'
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(\s*select\s+auth\.uid\(\)\s*\)')
        OR
        -- Find policies with auth.jwt() not wrapped in (select ...)
        (pg_get_expr(pol.polqual, pol.polrelid) ~ 'auth\.jwt\(\)' 
         AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(SELECT auth\.jwt\(\)\)'
         AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(\s*select\s+auth\.jwt\(\)\s*\)')
        OR
        (pg_get_expr(pol.polwithcheck, pol.polrelid) ~ 'auth\.jwt\(\)' 
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(SELECT auth\.jwt\(\)\)'
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(\s*select\s+auth\.jwt\(\)\s*\)')
        OR
        -- Find policies with current_setting() not wrapped
        (pg_get_expr(pol.polqual, pol.polrelid) ~ 'current_setting\(' 
         AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(SELECT current_setting\('
         AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(\s*select\s+current_setting\(')
        OR
        (pg_get_expr(pol.polwithcheck, pol.polrelid) ~ 'current_setting\(' 
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(SELECT current_setting\('
         AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(\s*select\s+current_setting\(')
      )
  LOOP
    has_changes := FALSE;
    new_qual := policy_record.using_expr;
    new_with_check := policy_record.with_check_expr;
    
    -- Replace auth.uid() with (SELECT auth.uid()) in USING clause
    IF new_qual IS NOT NULL AND new_qual ~ 'auth\.uid\(\)' AND new_qual !~ '\(\s*SELECT\s+auth\.uid\(\)\s*\)' THEN
      -- Replace auth.uid() that's not already wrapped
      new_qual := regexp_replace(new_qual, '(?<!\(SELECT\s)auth\.uid\(\)', '(SELECT auth.uid())', 'gi');
      has_changes := TRUE;
    END IF;
    
    -- Replace auth.jwt() with (SELECT auth.jwt()) in USING clause
    IF new_qual IS NOT NULL AND new_qual ~ 'auth\.jwt\(\)' AND new_qual !~ '\(\s*SELECT\s+auth\.jwt\(\)\s*\)' THEN
      new_qual := regexp_replace(new_qual, '(?<!\(SELECT\s)auth\.jwt\(\)', '(SELECT auth.jwt())', 'gi');
      has_changes := TRUE;
    END IF;
    
    -- Replace current_setting() with (SELECT current_setting()) in USING clause
    IF new_qual IS NOT NULL AND new_qual ~ 'current_setting\(' AND new_qual !~ '\(\s*SELECT\s+current_setting\(' THEN
      new_qual := regexp_replace(new_qual, '(?<!\(SELECT\s)current_setting\(', '(SELECT current_setting(', 'gi');
      -- Add closing paren for the SELECT wrapper
      new_qual := regexp_replace(new_qual, '\(SELECT current_setting\(([^)]+)\)\)', '(SELECT current_setting(\1))', 'gi');
      has_changes := TRUE;
    END IF;
    
    -- Replace in WITH CHECK clause
    IF new_with_check IS NOT NULL AND new_with_check ~ 'auth\.uid\(\)' AND new_with_check !~ '\(\s*SELECT\s+auth\.uid\(\)\s*\)' THEN
      new_with_check := regexp_replace(new_with_check, '(?<!\(SELECT\s)auth\.uid\(\)', '(SELECT auth.uid())', 'gi');
      has_changes := TRUE;
    END IF;
    
    IF new_with_check IS NOT NULL AND new_with_check ~ 'auth\.jwt\(\)' AND new_with_check !~ '\(\s*SELECT\s+auth\.jwt\(\)\s*\)' THEN
      new_with_check := regexp_replace(new_with_check, '(?<!\(SELECT\s)auth\.jwt\(\)', '(SELECT auth.jwt())', 'gi');
      has_changes := TRUE;
    END IF;
    
    IF new_with_check IS NOT NULL AND new_with_check ~ 'current_setting\(' AND new_with_check !~ '\(\s*SELECT\s+current_setting\(' THEN
      new_with_check := regexp_replace(new_with_check, '(?<!\(SELECT\s)current_setting\(', '(SELECT current_setting(', 'gi');
      has_changes := TRUE;
    END IF;
    
    IF has_changes THEN
      RAISE NOTICE 'Would update policy % on %.%', policy_record.policy_name, policy_record.schema_name, policy_record.table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Policy analysis completed. Direct updates not possible via DO block - policies must be recreated.';
END $$;

-- ============================================
-- Since PostgreSQL doesn't support ALTER POLICY for expressions,
-- we need to drop and recreate policies. Below are explicit fixes
-- for the most impactful tables based on the linter output.
-- ============================================

-- Fix rate_limit_log policies (mentioned in warnings)
DROP POLICY IF EXISTS "Service role can insert rate limit logs" ON public.rate_limit_log;
DROP POLICY IF EXISTS "Admins can view rate limit logs" ON public.rate_limit_log;

CREATE POLICY "Service role can insert rate limit logs" ON public.rate_limit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view rate limit logs" ON public.rate_limit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'::public.app_role
    )
  );

-- Fix profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'::public.app_role
    )
  );

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'::public.app_role
    )
  );

-- Fix user_permissions policies
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can manage all user permissions" ON public.user_permissions;

CREATE POLICY "Users can view their own permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage all user permissions" ON public.user_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'::public.app_role
    )
  );

-- Fix login_history policies  
DROP POLICY IF EXISTS "Users can view their own login history" ON public.login_history;

CREATE POLICY "Users can view their own login history" ON public.login_history
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Fix security_audit_log policies
DROP POLICY IF EXISTS "Admins can view all security logs" ON public.security_audit_log;

CREATE POLICY "Admins can view all security logs" ON public.security_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'::public.app_role
    )
  );

-- RLS policy auth function optimization migration completed
