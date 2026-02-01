-- Migration: Enable RLS on critical tables
-- Issue: Supabase linter detected RLS disabled on public tables
-- Tables: credit_system_config, sms_delivery_log

-- ============================================
-- 1. Enable RLS on sms_delivery_log
-- ============================================
-- The table has policies but RLS may not be enabled
ALTER TABLE public.sms_delivery_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Enable RLS on credit_system_config
-- ============================================
ALTER TABLE public.credit_system_config ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Platform admins can view config" ON public.credit_system_config;
DROP POLICY IF EXISTS "Platform admins can manage config" ON public.credit_system_config;
DROP POLICY IF EXISTS "Service role full access to config" ON public.credit_system_config;
DROP POLICY IF EXISTS "Authenticated users can view config" ON public.credit_system_config;

-- Create service role policy for full access (needed for edge functions)
CREATE POLICY "Service role full access to config"
ON public.credit_system_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Platform admins can view and manage all config
CREATE POLICY "Platform admins can manage config"
ON public.credit_system_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::public.app_role
  )
);

-- All authenticated users can read config (needed for credit checks)
CREATE POLICY "Authenticated users can view config"
ON public.credit_system_config
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 3. Verify RLS is enabled
-- ============================================
-- This will throw an error if RLS is not enabled, ensuring the migration worked
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'sms_delivery_log'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on sms_delivery_log';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'credit_system_config'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on credit_system_config';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on critical tables';
END $$;
