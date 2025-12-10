
-- Create the user_can_access_client function
-- This function checks if a user can access a specific client based on their roles
CREATE OR REPLACE FUNCTION public.user_can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins can access all clients
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  )
  OR
  -- Agency owners can access clients in their org
  EXISTS (
    SELECT 1 
    FROM clients c
    JOIN org_members om ON om.org_id = c.org_id
    JOIN user_roles ur ON ur.user_id = om.user_id
    WHERE c.id = _client_id 
      AND om.user_id = _user_id
      AND ur.role = 'agency_owner'
  )
  OR
  -- Users directly assigned to the client
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_id = _client_id AND user_id = _user_id
  );
$$;

-- Create the user_has_org_access function  
CREATE OR REPLACE FUNCTION public.user_has_org_access(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins can access all orgs
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  )
  OR
  -- Org members can access their org
  EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = _org_id AND user_id = _user_id
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_can_access_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_org_access(uuid, uuid) TO authenticated;
