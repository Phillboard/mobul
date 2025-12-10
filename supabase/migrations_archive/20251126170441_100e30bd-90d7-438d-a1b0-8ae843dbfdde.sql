-- Fix infinite recursion in org_members and client_users RLS policies
-- Create security definer functions to avoid recursive policy checks

-- Function to check if user is member of an organization
CREATE OR REPLACE FUNCTION user_is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE user_id = _user_id AND org_id = _org_id
  );
$$;

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_org_ids(_user_id uuid)
RETURNS TABLE(org_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = _user_id;
$$;

-- Function to get user's client IDs
CREATE OR REPLACE FUNCTION get_user_client_ids(_user_id uuid)
RETURNS TABLE(client_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM client_users WHERE user_id = _user_id;
$$;

-- Drop all existing org_members policies
DROP POLICY IF EXISTS "Admins can view all org memberships" ON org_members;
DROP POLICY IF EXISTS "Agency owners can view org memberships" ON org_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON org_members;
DROP POLICY IF EXISTS "Admins can insert org memberships" ON org_members;
DROP POLICY IF EXISTS "Agency owners can insert org memberships" ON org_members;
DROP POLICY IF EXISTS "Admins can delete org memberships" ON org_members;
DROP POLICY IF EXISTS "Agency owners can delete org memberships" ON org_members;
DROP POLICY IF EXISTS "Users can view org members of their orgs" ON org_members;

-- Create fixed policies for org_members using security definer functions

-- View policies
CREATE POLICY "Admins can view all org memberships"
ON org_members FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agency owners can view their org memberships"
ON org_members FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner') 
  AND org_id IN (SELECT get_user_org_ids(auth.uid()))
);

CREATE POLICY "Users can view own memberships"
ON org_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Insert policies
CREATE POLICY "Admins can insert org memberships"
ON org_members FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agency owners can insert to their orgs"
ON org_members FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'agency_owner')
  AND org_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- Delete policies
CREATE POLICY "Admins can delete org memberships"
ON org_members FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agency owners can delete from their orgs"
ON org_members FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner')
  AND org_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- Drop all existing client_users policies
DROP POLICY IF EXISTS "Admins can view all client memberships" ON client_users;
DROP POLICY IF EXISTS "Agency owners can view client memberships" ON client_users;
DROP POLICY IF EXISTS "Company owners can view client memberships" ON client_users;
DROP POLICY IF EXISTS "Users can view own client memberships" ON client_users;
DROP POLICY IF EXISTS "Admins can insert client memberships" ON client_users;
DROP POLICY IF EXISTS "Agency owners can insert client memberships" ON client_users;
DROP POLICY IF EXISTS "Company owners can insert client memberships" ON client_users;
DROP POLICY IF EXISTS "Admins can delete client memberships" ON client_users;
DROP POLICY IF EXISTS "Agency owners can delete client memberships" ON client_users;
DROP POLICY IF EXISTS "Company owners can delete client memberships" ON client_users;

-- Create fixed policies for client_users

-- View policies
CREATE POLICY "Admins can view all client memberships"
ON client_users FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agency owners can view their clients' memberships"
ON client_users FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner')
  AND client_id IN (
    SELECT c.id FROM clients c
    WHERE c.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Company owners can view their client memberships"
ON client_users FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'company_owner')
  AND client_id IN (SELECT get_user_client_ids(auth.uid()))
);

CREATE POLICY "Users can view own client memberships"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Insert policies
CREATE POLICY "Admins can insert client memberships"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agency owners can insert to their clients"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'agency_owner')
  AND client_id IN (
    SELECT c.id FROM clients c
    WHERE c.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Company owners can insert to their client"
ON client_users FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'company_owner')
  AND client_id IN (SELECT get_user_client_ids(auth.uid()))
);

-- Delete policies
CREATE POLICY "Admins can delete client memberships"
ON client_users FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agency owners can delete from their clients"
ON client_users FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner')
  AND client_id IN (
    SELECT c.id FROM clients c
    WHERE c.org_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Company owners can delete from their client"
ON client_users FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'company_owner')
  AND client_id IN (SELECT get_user_client_ids(auth.uid()))
);