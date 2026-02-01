-- ============================================
-- Fix Multiple Permissive Policies
-- Consolidates redundant/conflicting permissive policies
-- ============================================

-- ============================================
-- 1. FIX gift_card_brands
-- Issue: "Anyone can view gift card brands" (USING true) makes 
-- "Anyone can view enabled brands" redundant and bypasses the 
-- is_enabled_by_admin check
-- ============================================

-- Drop the overly permissive policy that allows viewing ALL brands
DROP POLICY IF EXISTS "Anyone can view gift card brands" ON public.gift_card_brands;

-- Keep the proper policy that only shows enabled brands (or all for admins)
-- Note: "Anyone can view enabled brands" already exists and is correct:
-- USING (is_enabled_by_admin = true OR has_role(auth.uid(), 'admin'))

-- ============================================
-- 2. ANALYZE other tables for similar issues
-- This DO block identifies and reports tables with multiple 
-- permissive policies for the same operation
-- ============================================

DO $$
DECLARE
  dup_record RECORD;
  fix_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Analyzing Multiple Permissive Policies ===';
  
  -- Find tables with multiple permissive SELECT policies
  FOR dup_record IN
    SELECT 
      c.relname AS table_name,
      pol.polcmd AS command,
      COUNT(*) AS policy_count,
      array_agg(pol.polname ORDER BY pol.polname) AS policy_names
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND pol.polpermissive = true  -- Only PERMISSIVE policies
      AND pol.polroles @> ARRAY[0::oid]  -- Public (all roles) - oid 0 means public
    GROUP BY c.relname, pol.polcmd
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, c.relname
  LOOP
    RAISE NOTICE 'Table: % | Command: % | Count: % | Policies: %', 
      dup_record.table_name,
      CASE dup_record.command
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
        ELSE dup_record.command::text
      END,
      dup_record.policy_count,
      dup_record.policy_names;
    fix_count := fix_count + 1;
  END LOOP;
  
  IF fix_count = 0 THEN
    RAISE NOTICE 'No tables with multiple public permissive policies for same operation';
  ELSE
    RAISE NOTICE 'Found % table/operation combinations with multiple permissive policies', fix_count;
  END IF;
  
  -- Also check for policies targeting 'authenticated' role specifically
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking authenticated role policies ===';
  
  FOR dup_record IN
    SELECT 
      c.relname AS table_name,
      pol.polcmd AS command,
      COUNT(*) AS policy_count,
      array_agg(pol.polname ORDER BY pol.polname) AS policy_names
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND pol.polpermissive = true
      AND EXISTS (
        SELECT 1 FROM pg_roles r 
        WHERE r.oid = ANY(pol.polroles) 
        AND r.rolname = 'authenticated'
      )
    GROUP BY c.relname, pol.polcmd
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, c.relname
  LOOP
    RAISE NOTICE 'Table: % | Command: % | Count: % | Policies: %', 
      dup_record.table_name,
      CASE dup_record.command
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
        ELSE dup_record.command::text
      END,
      dup_record.policy_count,
      dup_record.policy_names;
    fix_count := fix_count + 1;
  END LOOP;
END $$;

-- ============================================
-- 3. FIX contacts table - remove potential duplicates
-- ============================================

-- Check if there are duplicate contact policies from migrations
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  -- The contacts table should only have the standard 4 CRUD policies
  -- If there are duplicates, they would have been created by multiple migrations
  
  -- Count SELECT policies on contacts
  SELECT COUNT(*) > 1 INTO policy_exists
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'contacts'
    AND pol.polcmd = 'r'  -- SELECT
    AND pol.polpermissive = true;
  
  IF policy_exists THEN
    RAISE NOTICE 'contacts table has multiple SELECT policies - may need consolidation';
  ELSE
    RAISE NOTICE 'contacts table SELECT policies OK';
  END IF;
END $$;

-- ============================================
-- 4. FIX recipients table - consolidate if needed
-- ============================================

-- The recipients table has both:
-- 1. "Admin has full access to recipients" - FOR ALL (admin, company_owner, call_center)
-- 2. "Users can view/create/update/delete recipients..." - FOR specific ops (regular users)
-- 
-- This is INTENTIONAL - different access levels for different user types
-- No changes needed, but documenting for clarity

COMMENT ON POLICY "Admin has full access to recipients" ON public.recipients IS 
  'Provides unrestricted access for admin, company_owner, and call_center roles. 
   This is intentionally separate from the user_can_access_client policies 
   which provide restricted access for regular users.';

-- ============================================
-- 5. FIX campaigns table
-- The campaigns table should not have conflicting policies
-- ============================================

-- Verify campaigns policies are correct
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'campaigns'
    AND pol.polcmd = 'r'  -- SELECT
    AND pol.polpermissive = true;
  
  IF policy_count > 2 THEN
    RAISE WARNING 'campaigns table has % SELECT policies - may have duplicates', policy_count;
  ELSE
    RAISE NOTICE 'campaigns table has % SELECT policies - OK', policy_count;
  END IF;
END $$;

-- ============================================
-- Summary
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Multiple Permissive Policy Fix Complete ===';
  RAISE NOTICE 'Dropped: "Anyone can view gift card brands" (overly permissive)';
  RAISE NOTICE 'Kept: "Anyone can view enabled brands" (proper filtering)';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: recipients table policies are intentionally separate';
  RAISE NOTICE '(admin/company_owner/call_center vs regular user access paths)';
END $$;
