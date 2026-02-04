-- ============================================================================
-- Add Monitoring Permissions
-- ============================================================================
-- Seeds the new granular monitoring permissions into the permissions table
-- and assigns them to appropriate roles.
-- ============================================================================

-- Insert new monitoring permissions
INSERT INTO public.permissions (name, description, module, category)
VALUES
  ('monitoring.view', 'View activity logs (scoped to org/client)', 'monitoring', 'monitoring'),
  ('monitoring.system', 'View system health and performance metrics', 'monitoring', 'monitoring'),
  ('monitoring.errors', 'View and manage error logs', 'monitoring', 'monitoring'),
  ('monitoring.alerts', 'View and manage alerts', 'monitoring', 'monitoring'),
  ('monitoring.audit', 'View compliance audit trails', 'monitoring', 'monitoring'),
  ('monitoring.export', 'Export logs to CSV/PDF', 'monitoring', 'monitoring'),
  ('monitoring.realtime', 'Access real-time activity feeds', 'monitoring', 'monitoring'),
  ('monitoring.reports', 'Manage scheduled reports', 'monitoring', 'monitoring'),
  ('monitoring.api', 'API access to logs', 'monitoring', 'monitoring')
ON CONFLICT (name) DO NOTHING;

-- Assign monitoring permissions to admin role (admin gets everything via code, but explicit is good)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::public.app_role, id FROM public.permissions WHERE name LIKE 'monitoring.%'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign monitoring permissions to tech_support role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'tech_support'::public.app_role, id FROM public.permissions WHERE name IN (
  'monitoring.view', 'monitoring.system', 'monitoring.errors', 
  'monitoring.alerts', 'monitoring.audit', 'monitoring.export', 'monitoring.realtime'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign monitoring permissions to agency_owner role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'agency_owner'::public.app_role, id FROM public.permissions WHERE name IN (
  'monitoring.view', 'monitoring.alerts', 'monitoring.export', 
  'monitoring.realtime', 'monitoring.reports'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign monitoring permissions to company_owner role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'company_owner'::public.app_role, id FROM public.permissions WHERE name IN (
  'monitoring.view', 'monitoring.alerts', 'monitoring.export', 'monitoring.realtime'
)
ON CONFLICT (role, permission_id) DO NOTHING;
