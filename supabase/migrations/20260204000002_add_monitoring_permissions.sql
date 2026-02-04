-- ============================================================================
-- Add Monitoring Permissions
-- ============================================================================
-- Seeds the new granular monitoring permissions into the permissions table
-- and assigns them to appropriate roles.
-- ============================================================================

-- Insert new monitoring permissions
INSERT INTO public.permissions (name, description, category)
VALUES
  ('monitoring.view', 'View activity logs (scoped to org/client)', 'monitoring'),
  ('monitoring.system', 'View system health and performance metrics', 'monitoring'),
  ('monitoring.errors', 'View and manage error logs', 'monitoring'),
  ('monitoring.alerts', 'View and manage alerts', 'monitoring'),
  ('monitoring.audit', 'View compliance audit trails', 'monitoring'),
  ('monitoring.export', 'Export logs to CSV/PDF', 'monitoring'),
  ('monitoring.realtime', 'Access real-time activity feeds', 'monitoring'),
  ('monitoring.reports', 'Manage scheduled reports', 'monitoring'),
  ('monitoring.api', 'API access to logs', 'monitoring')
ON CONFLICT (name) DO NOTHING;

-- Assign monitoring permissions to admin role (admin gets everything via code, but explicit is good)
INSERT INTO public.role_permissions (role, permission_name)
SELECT 'admin', name FROM public.permissions WHERE name LIKE 'monitoring.%'
ON CONFLICT (role, permission_name) DO NOTHING;

-- Assign monitoring permissions to tech_support role
INSERT INTO public.role_permissions (role, permission_name)
VALUES
  ('tech_support', 'monitoring.view'),
  ('tech_support', 'monitoring.system'),
  ('tech_support', 'monitoring.errors'),
  ('tech_support', 'monitoring.alerts'),
  ('tech_support', 'monitoring.audit'),
  ('tech_support', 'monitoring.export'),
  ('tech_support', 'monitoring.realtime')
ON CONFLICT (role, permission_name) DO NOTHING;

-- Assign monitoring permissions to agency_owner role
INSERT INTO public.role_permissions (role, permission_name)
VALUES
  ('agency_owner', 'monitoring.view'),
  ('agency_owner', 'monitoring.alerts'),
  ('agency_owner', 'monitoring.export'),
  ('agency_owner', 'monitoring.realtime'),
  ('agency_owner', 'monitoring.reports')
ON CONFLICT (role, permission_name) DO NOTHING;

-- Assign monitoring permissions to company_owner role
INSERT INTO public.role_permissions (role, permission_name)
VALUES
  ('company_owner', 'monitoring.view'),
  ('company_owner', 'monitoring.alerts'),
  ('company_owner', 'monitoring.export'),
  ('company_owner', 'monitoring.realtime')
ON CONFLICT (role, permission_name) DO NOTHING;
