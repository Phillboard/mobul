-- Fix infinite recursion in clients table RLS policies
-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Agency owners can view their org clients" ON public.clients;
DROP POLICY IF EXISTS "Agency owners can view their org's clients" ON public.clients;
DROP POLICY IF EXISTS "All authenticated users can view their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Company owners can view their assigned client" ON public.clients;
DROP POLICY IF EXISTS "Company owners can view their assigned clients" ON public.clients;

-- Create clean, non-recursive policies using SECURITY DEFINER functions

-- Admin policy: admins see everything
CREATE POLICY "admin_select_all_clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Agency owner policy: see clients in their organizations
CREATE POLICY "agency_owner_select_clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner'::app_role) 
  AND org_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- All authenticated users: see clients they're assigned to
CREATE POLICY "user_select_assigned_clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  id IN (SELECT get_user_client_ids(auth.uid()))
);

-- Admin insert/update/delete
CREATE POLICY "admin_manage_clients"
ON public.clients
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Agency owners can manage clients in their orgs
CREATE POLICY "agency_owner_manage_clients"
ON public.clients
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner'::app_role)
  AND org_id IN (SELECT get_user_org_ids(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'agency_owner'::app_role)
  AND org_id IN (SELECT get_user_org_ids(auth.uid()))
);