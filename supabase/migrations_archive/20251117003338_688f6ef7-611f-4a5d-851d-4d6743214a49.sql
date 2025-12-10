-- Final corrected migration: Clean slate approach
-- Step 1: Save existing role data  
CREATE TEMP TABLE temp_roles_backup AS
SELECT 
  ur.user_id,
  ur.role::text as old_role,
  ur.created_at
FROM public.user_roles ur;

-- Step 2: Drop everything cleanly
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.role_hierarchy CASCADE;
DROP TABLE IF EXISTS public.agency_client_assignments CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Step 3: Create new enum
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'tech_support',
  'agency_owner', 
  'company_owner',
  'developer',
  'call_center'
);

-- Step 4: Create new user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Step 5: Restore and convert data
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
  user_id,
  CASE 
    WHEN old_role = 'platform_admin' THEN 'admin'::app_role
    WHEN old_role = 'org_admin' THEN 'agency_owner'::app_role
    WHEN old_role = 'agency_admin' THEN 'agency_owner'::app_role  
    WHEN old_role = 'client_user' THEN 'company_owner'::app_role
    WHEN old_role = 'admin' THEN 'admin'::app_role
    WHEN old_role = 'agency_owner' THEN 'agency_owner'::app_role
    WHEN old_role = 'company_owner' THEN 'company_owner'::app_role
    ELSE 'company_owner'::app_role
  END,
  created_at
FROM temp_roles_backup;

-- Step 6: Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"  
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Step 8: Create role_hierarchy
CREATE TABLE public.role_hierarchy (
  role public.app_role PRIMARY KEY,
  level INTEGER NOT NULL,
  can_manage_roles public.app_role[] NOT NULL,
  description TEXT
);

INSERT INTO public.role_hierarchy (role, level, can_manage_roles, description) VALUES
  ('admin', 1, ARRAY['tech_support', 'agency_owner', 'company_owner', 'developer', 'call_center']::app_role[], 'Platform administrator'),
  ('tech_support', 2, ARRAY['agency_owner', 'company_owner', 'developer', 'call_center']::app_role[], 'Technical support'),
  ('agency_owner', 3, ARRAY['company_owner', 'developer', 'call_center']::app_role[], 'Agency owner'),
  ('company_owner', 4, ARRAY['developer', 'call_center']::app_role[], 'Company owner'),
  ('developer', 5, ARRAY[]::app_role[], 'Developer'),
  ('call_center', 6, ARRAY[]::app_role[], 'Call center employee');

-- Step 9: Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_role(_user_id UUID, _target_role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_hierarchy rh ON rh.role = ur.role
    WHERE ur.user_id = _user_id AND _target_role = ANY(rh.can_manage_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_level(_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MIN(rh.level), 999)
  FROM public.user_roles ur
  JOIN public.role_hierarchy rh ON rh.role = ur.role
  WHERE ur.user_id = _user_id;
$$;

-- Step 10: Create agency_client_assignments
CREATE TABLE public.agency_client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id),
  UNIQUE(agency_org_id, client_id)
);

ALTER TABLE public.agency_client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency owners can view their assignments"
  ON public.agency_client_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = agency_org_id AND om.user_id = auth.uid()
    )
  );

-- Step 11: Add new permissions
INSERT INTO public.permissions (name, module, description) VALUES
  ('companies.create', 'companies', 'Create new companies'),
  ('giftcards.assign_to_company', 'giftcards', 'Assign gift cards to companies'),
  ('calls.confirm_redemption', 'calls', 'Confirm gift card redemption'),
  ('users.view_subordinates', 'users', 'View subordinate users')
ON CONFLICT (name) DO NOTHING;