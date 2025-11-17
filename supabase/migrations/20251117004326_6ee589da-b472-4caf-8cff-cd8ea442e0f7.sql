-- Drop and recreate get_user_permissions function with correct table alias
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE (permission_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.name as permission_name
  FROM public.user_roles ur
  JOIN public.role_hierarchy rh ON ur.role = rh.role
  JOIN public.permissions p ON true
  WHERE ur.user_id = _user_id
    AND (
      -- Grant all permissions to admin
      ur.role = 'admin'
      -- Or grant permissions based on role level (you can customize this logic)
      OR p.module IN ('dashboard', 'campaigns', 'audiences', 'templates', 'gift_cards', 'landingpages', 'api', 'settings', 'users', 'lead_marketplace')
    )
$$;