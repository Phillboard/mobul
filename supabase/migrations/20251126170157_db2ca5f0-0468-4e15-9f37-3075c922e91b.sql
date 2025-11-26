-- Fix RLS policies for org_members to allow admin assignment

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own org memberships" ON org_members;
DROP POLICY IF EXISTS "Users can insert their own org memberships" ON org_members;
DROP POLICY IF EXISTS "Users can update their own org memberships" ON org_members;
DROP POLICY IF EXISTS "Users can delete their own org memberships" ON org_members;

-- Create comprehensive policies for org_members

-- Admins can view all org memberships
CREATE POLICY "Admins can view all org memberships"
ON org_members
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Agency owners can view memberships in their org
CREATE POLICY "Agency owners can view org memberships"
ON org_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner') 
  AND org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
ON org_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can insert any org membership
CREATE POLICY "Admins can insert org memberships"
ON org_members
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Agency owners can insert memberships to their org
CREATE POLICY "Agency owners can insert org memberships"
ON org_members
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'agency_owner')
  AND org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);

-- Admins can delete any org membership
CREATE POLICY "Admins can delete org memberships"
ON org_members
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Agency owners can delete memberships from their org
CREATE POLICY "Agency owners can delete org memberships"
ON org_members
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_owner')
  AND org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);