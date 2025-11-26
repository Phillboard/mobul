-- Fix RLS policies on clients table to allow proper access
-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Users can view clients they have access to" ON clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Agency owners can view their org clients" ON clients;
DROP POLICY IF EXISTS "Company owners can view their client" ON clients;

-- Create comprehensive SELECT policies for clients table
CREATE POLICY "Admins can view all clients"
ON clients FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agency owners can view their org clients"
ON clients FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner')
  AND org_id IN (SELECT get_user_org_ids(auth.uid()))
);

CREATE POLICY "Company owners can view their assigned client"
ON clients FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'company_owner')
  AND id IN (SELECT get_user_client_ids(auth.uid()))
);

CREATE POLICY "All authenticated users can view their assigned clients"
ON clients FOR SELECT
TO authenticated
USING (
  id IN (SELECT get_user_client_ids(auth.uid()))
);