-- Fix platform_admin_exists function to check for 'admin' role instead of non-existent 'platform_admin'
CREATE OR REPLACE FUNCTION public.platform_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE role = 'admin'
  );
$$;