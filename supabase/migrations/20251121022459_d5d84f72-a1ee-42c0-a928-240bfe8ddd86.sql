-- Phase 3: Security Hardening - Fix RLS policies and function search paths

-- =====================================================
-- 1. Add RLS policies for client_users table
-- =====================================================
-- Admins can view all client-user assignments
CREATE POLICY "Admins can view all client users"
ON public.client_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own client assignments
CREATE POLICY "Users can view their own client assignments"
ON public.client_users
FOR SELECT
USING (auth.uid() = user_id);

-- Users with client access can view that client's user list
CREATE POLICY "Users can view client user list for accessible clients"
ON public.client_users
FOR SELECT
USING (user_can_access_client(auth.uid(), client_id));

-- Admins can manage client-user assignments
CREATE POLICY "Admins can manage client users"
ON public.client_users
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 2. Add RLS policies for vendors table (lead marketplace)
-- =====================================================
-- Everyone can view active vendors
CREATE POLICY "Anyone can view active vendors"
ON public.vendors
FOR SELECT
USING (active = true);

-- Admins can view all vendors including inactive
CREATE POLICY "Admins can view all vendors"
ON public.vendors
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage vendors
CREATE POLICY "Admins can manage vendors"
ON public.vendors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. Add RLS policies for lead_sources table
-- =====================================================
-- Admins can view all lead sources
CREATE POLICY "Admins can view all lead sources"
ON public.lead_sources
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage lead sources
CREATE POLICY "Admins can manage lead sources"
ON public.lead_sources
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 4. Fix update_updated_at_column function search path
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;