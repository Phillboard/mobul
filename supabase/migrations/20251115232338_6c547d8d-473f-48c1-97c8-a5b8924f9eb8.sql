-- Create permissions table for feature-level access control
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL, -- e.g., 'campaigns', 'templates', 'analytics'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Create user_permissions for user-specific overrides
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true, -- true = grant, false = revoke
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions (admins can manage)
CREATE POLICY "Org admins can manage permissions"
  ON public.permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Everyone can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for role_permissions
CREATE POLICY "Org admins can manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Everyone can view role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_permissions
CREATE POLICY "Org admins can manage user permissions"
  ON public.user_permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check user-specific permission override (revoked)
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = _user_id 
        AND p.name = _permission_name
        AND up.granted = false
    ) THEN false
    -- Check user-specific permission grant
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = _user_id 
        AND p.name = _permission_name
        AND up.granted = true
    ) THEN true
    -- Check role-based permissions
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = _user_id
        AND p.name = _permission_name
    ) THEN true
    ELSE false
  END;
$$;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(permission_name TEXT, module TEXT, granted_by TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Get permissions from roles
  SELECT DISTINCT p.name, p.module, 'role' as granted_by
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = _user_id
  
  UNION
  
  -- Get user-specific permission grants
  SELECT p.name, p.module, 'user' as granted_by
  FROM public.user_permissions up
  JOIN public.permissions p ON p.id = up.permission_id
  WHERE up.user_id = _user_id
    AND up.granted = true
  
  EXCEPT
  
  -- Remove user-specific permission revocations
  SELECT p.name, p.module, 'user' as granted_by
  FROM public.user_permissions up
  JOIN public.permissions p ON p.id = up.permission_id
  WHERE up.user_id = _user_id
    AND up.granted = false;
$$;

-- Insert default permissions for all modules
INSERT INTO public.permissions (name, description, module) VALUES
  -- Dashboard
  ('dashboard.view', 'View dashboard', 'dashboard'),
  
  -- Campaigns
  ('campaigns.view', 'View campaigns', 'campaigns'),
  ('campaigns.create', 'Create campaigns', 'campaigns'),
  ('campaigns.edit', 'Edit campaigns', 'campaigns'),
  ('campaigns.delete', 'Delete campaigns', 'campaigns'),
  ('campaigns.approve', 'Approve campaigns', 'campaigns'),
  
  -- Templates
  ('templates.view', 'View templates', 'templates'),
  ('templates.create', 'Create templates', 'templates'),
  ('templates.edit', 'Edit templates', 'templates'),
  ('templates.delete', 'Delete templates', 'templates'),
  
  -- Audiences
  ('audiences.view', 'View audiences', 'audiences'),
  ('audiences.create', 'Create audiences', 'audiences'),
  ('audiences.edit', 'Edit audiences', 'audiences'),
  ('audiences.delete', 'Delete audiences', 'audiences'),
  ('audiences.import', 'Import audiences', 'audiences'),
  
  -- Analytics
  ('analytics.view', 'View analytics', 'analytics'),
  ('analytics.export', 'Export analytics', 'analytics'),
  
  -- Settings
  ('settings.view', 'View settings', 'settings'),
  ('settings.edit', 'Edit settings', 'settings'),
  ('settings.phone_numbers', 'Manage phone numbers', 'settings'),
  ('settings.crm', 'Manage CRM integrations', 'settings'),
  ('settings.api', 'Manage API keys', 'settings'),
  
  -- API
  ('api.view', 'View API documentation', 'api'),
  ('api.manage', 'Manage API keys and webhooks', 'api'),
  
  -- Gift Cards
  ('gift_cards.view', 'View gift cards', 'gift_cards'),
  ('gift_cards.create', 'Create gift card pools', 'gift_cards'),
  ('gift_cards.edit', 'Edit gift card pools', 'gift_cards'),
  
  -- Lead Marketplace
  ('lead_marketplace.view', 'View lead marketplace', 'lead_marketplace'),
  ('lead_marketplace.purchase', 'Purchase leads', 'lead_marketplace'),
  
  -- Agent Dashboard
  ('agent.view', 'View agent dashboard', 'agent'),
  ('agent.manage_calls', 'Manage call sessions', 'agent'),
  
  -- User Management
  ('users.view', 'View users', 'admin'),
  ('users.manage', 'Manage users and permissions', 'admin');

-- Assign default permissions to roles
-- org_admin gets all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'org_admin', id FROM public.permissions;

-- agency_admin gets most permissions except user management
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'agency_admin', id FROM public.permissions
WHERE name NOT IN ('users.manage');

-- client_user gets basic view and create permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'client_user', id FROM public.permissions
WHERE name IN (
  'dashboard.view',
  'campaigns.view', 'campaigns.create',
  'templates.view', 'templates.create',
  'audiences.view', 'audiences.create', 'audiences.import',
  'analytics.view',
  'settings.view',
  'gift_cards.view',
  'lead_marketplace.view', 'lead_marketplace.purchase'
);