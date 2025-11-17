-- Fix RLS policies for clients and organizations tables

-- First, add policies for clients table (currently has no policies)
CREATE POLICY "Admins can view all clients"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agency owners can view their org's clients"
  ON public.clients FOR SELECT
  USING (
    public.has_role(auth.uid(), 'agency_owner'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = clients.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can view their assigned clients"
  ON public.clients FOR SELECT
  USING (
    public.has_role(auth.uid(), 'company_owner'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = clients.id AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all clients"
  ON public.clients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add policies for organizations table (only has SELECT policy, needs management)
CREATE POLICY "Admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all organizations"
  ON public.organizations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));