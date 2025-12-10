-- Fix RLS policies for client_users to allow admin/agency owner assignment

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Users can view their own client memberships" ON client_users;
DROP POLICY IF EXISTS "Users can insert their own client memberships" ON client_users;
DROP POLICY IF EXISTS "Users can update their own client memberships" ON client_users;
DROP POLICY IF EXISTS "Users can delete their own client memberships" ON client_users;

-- Create comprehensive policies for client_users

-- Admins can view all client memberships
CREATE POLICY "Admins can view all client memberships"
ON client_users
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Agency owners can view client memberships in their org's clients
CREATE POLICY "Agency owners can view client memberships"
ON client_users
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner')
  AND client_id IN (
    SELECT c.id 
    FROM clients c
    JOIN org_members om ON om.org_id = c.org_id
    WHERE om.user_id = auth.uid()
  )
);

-- Company owners can view memberships for their client
CREATE POLICY "Company owners can view client memberships"
ON client_users
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'company_owner')
  AND client_id IN (
    SELECT client_id FROM client_users WHERE user_id = auth.uid()
  )
);

-- Users can view their own memberships
CREATE POLICY "Users can view own client memberships"
ON client_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can insert any client membership
CREATE POLICY "Admins can insert client memberships"
ON client_users
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Agency owners can insert memberships to their org's clients
CREATE POLICY "Agency owners can insert client memberships"
ON client_users
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'agency_owner')
  AND client_id IN (
    SELECT c.id 
    FROM clients c
    JOIN org_members om ON om.org_id = c.org_id
    WHERE om.user_id = auth.uid()
  )
);

-- Company owners can insert memberships to their client
CREATE POLICY "Company owners can insert client memberships"
ON client_users
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'company_owner')
  AND client_id IN (
    SELECT client_id FROM client_users WHERE user_id = auth.uid()
  )
);

-- Admins can delete any client membership
CREATE POLICY "Admins can delete client memberships"
ON client_users
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Agency owners can delete memberships from their org's clients
CREATE POLICY "Agency owners can delete client memberships"
ON client_users
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner')
  AND client_id IN (
    SELECT c.id 
    FROM clients c
    JOIN org_members om ON om.org_id = c.org_id
    WHERE om.user_id = auth.uid()
  )
);

-- Company owners can delete memberships from their client
CREATE POLICY "Company owners can delete client memberships"
ON client_users
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'company_owner')
  AND client_id IN (
    SELECT client_id FROM client_users WHERE user_id = auth.uid()
  )
);