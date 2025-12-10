-- Add comprehensive permissions similar to GHL
-- Clear existing permissions and start fresh with comprehensive set
TRUNCATE permissions CASCADE;
TRUNCATE role_permissions CASCADE;

-- Dashboard & Analytics
INSERT INTO permissions (name, module, description) VALUES
  ('dashboard.view', 'dashboard', 'View dashboard and analytics'),
  ('dashboard.export', 'dashboard', 'Export dashboard data'),
  ('analytics.view', 'analytics', 'View analytics reports'),
  ('analytics.advanced', 'analytics', 'Access advanced analytics');

-- Campaigns
INSERT INTO permissions (name, module, description) VALUES
  ('campaigns.view', 'campaigns', 'View campaigns'),
  ('campaigns.create', 'campaigns', 'Create new campaigns'),
  ('campaigns.edit', 'campaigns', 'Edit campaigns'),
  ('campaigns.delete', 'campaigns', 'Delete campaigns'),
  ('campaigns.approve', 'campaigns', 'Approve campaigns'),
  ('campaigns.launch', 'campaigns', 'Launch campaigns'),
  ('campaigns.export', 'campaigns', 'Export campaign data');

-- Templates
INSERT INTO permissions (name, module, description) VALUES
  ('templates.view', 'templates', 'View templates'),
  ('templates.create', 'templates', 'Create templates'),
  ('templates.edit', 'templates', 'Edit templates'),
  ('templates.delete', 'templates', 'Delete templates'),
  ('templates.share', 'templates', 'Share templates');

-- Audiences
INSERT INTO permissions (name, module, description) VALUES
  ('audiences.view', 'audiences', 'View audiences'),
  ('audiences.create', 'audiences', 'Create audiences'),
  ('audiences.edit', 'audiences', 'Edit audiences'),
  ('audiences.delete', 'audiences', 'Delete audiences'),
  ('audiences.import', 'audiences', 'Import audience data'),
  ('audiences.export', 'audiences', 'Export audience data');

-- Gift Cards & Rewards
INSERT INTO permissions (name, module, description) VALUES
  ('giftcards.view', 'giftcards', 'View gift card pools'),
  ('giftcards.create', 'giftcards', 'Create gift card pools'),
  ('giftcards.edit', 'giftcards', 'Edit gift card pools'),
  ('giftcards.delete', 'giftcards', 'Delete gift card pools'),
  ('giftcards.import', 'giftcards', 'Import gift cards'),
  ('giftcards.send', 'giftcards', 'Send gift cards to recipients');

-- Call Tracking & Agent
INSERT INTO permissions (name, module, description) VALUES
  ('calls.view', 'calls', 'View call logs and recordings'),
  ('calls.manage', 'calls', 'Manage call sessions'),
  ('calls.agent_dashboard', 'calls', 'Access agent dashboard'),
  ('calls.complete_conditions', 'calls', 'Mark conditions as met'),
  ('calls.export', 'calls', 'Export call data');

-- Settings & Configuration
INSERT INTO permissions (name, module, description) VALUES
  ('settings.view', 'settings', 'View settings'),
  ('settings.edit', 'settings', 'Edit settings'),
  ('settings.billing', 'settings', 'Manage billing'),
  ('settings.integrations', 'settings', 'Manage integrations'),
  ('settings.api', 'settings', 'Manage API keys and webhooks'),
  ('settings.phone_numbers', 'settings', 'Manage phone numbers');

-- Users & Teams
INSERT INTO permissions (name, module, description) VALUES
  ('users.view', 'users', 'View users'),
  ('users.create', 'users', 'Create/invite users'),
  ('users.edit', 'users', 'Edit user details'),
  ('users.delete', 'users', 'Delete users'),
  ('users.manage_roles', 'users', 'Manage user roles'),
  ('users.manage_permissions', 'users', 'Manage user permissions');

-- Clients (for agencies)
INSERT INTO permissions (name, module, description) VALUES
  ('clients.view', 'clients', 'View clients'),
  ('clients.create', 'clients', 'Create clients'),
  ('clients.edit', 'clients', 'Edit clients'),
  ('clients.delete', 'clients', 'Delete clients'),
  ('clients.manage_users', 'clients', 'Manage client users');

-- Organizations (platform level)
INSERT INTO permissions (name, module, description) VALUES
  ('organizations.view', 'organizations', 'View organizations'),
  ('organizations.create', 'organizations', 'Create organizations'),
  ('organizations.edit', 'organizations', 'Edit organizations'),
  ('organizations.delete', 'organizations', 'Delete organizations');

-- Lead Marketplace
INSERT INTO permissions (name, module, description) VALUES
  ('leads.view', 'leads', 'View lead marketplace'),
  ('leads.purchase', 'leads', 'Purchase leads'),
  ('leads.export', 'leads', 'Export leads');

-- Platform Admin (super user)
INSERT INTO permissions (name, module, description) VALUES
  ('platform.manage_all', 'platform', 'Full platform access'),
  ('platform.view_all_orgs', 'platform', 'View all organizations'),
  ('platform.manage_all_users', 'platform', 'Manage all users'),
  ('platform.system_settings', 'platform', 'Manage system settings');

-- Create permission templates table
CREATE TABLE IF NOT EXISTS permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add default permission templates (like GHL roles)
INSERT INTO permission_templates (name, description, permissions, is_system) VALUES
  (
    'Full Admin',
    'Complete access to all features',
    (SELECT jsonb_agg(name) FROM permissions WHERE module != 'platform'),
    true
  ),
  (
    'Campaign Manager',
    'Manage campaigns, templates, and audiences',
    '["campaigns.view", "campaigns.create", "campaigns.edit", "campaigns.approve", "campaigns.launch", "templates.view", "templates.create", "templates.edit", "audiences.view", "audiences.create", "audiences.edit", "audiences.import", "dashboard.view", "analytics.view"]'::jsonb,
    true
  ),
  (
    'Call Agent',
    'Access to call dashboard and managing calls',
    '["calls.view", "calls.manage", "calls.agent_dashboard", "calls.complete_conditions", "dashboard.view"]'::jsonb,
    true
  ),
  (
    'Mail House User',
    'Upload and manage audiences only',
    '["audiences.view", "audiences.import", "campaigns.view"]'::jsonb,
    true
  ),
  (
    'Viewer',
    'Read-only access to view data',
    '["dashboard.view", "campaigns.view", "templates.view", "audiences.view", "analytics.view", "calls.view"]'::jsonb,
    true
  ),
  (
    'Gift Card Manager',
    'Manage gift card pools and deliveries',
    '["giftcards.view", "giftcards.create", "giftcards.edit", "giftcards.import", "giftcards.send", "campaigns.view", "dashboard.view"]'::jsonb,
    true
  );

-- Assign default permissions to existing roles
-- Platform Admin gets everything
INSERT INTO role_permissions (role, permission_id)
SELECT 'platform_admin', id FROM permissions;

-- Org Admin gets everything except platform
INSERT INTO role_permissions (role, permission_id)
SELECT 'org_admin', id FROM permissions WHERE module != 'platform';

-- Agency Admin gets most things
INSERT INTO role_permissions (role, permission_id)
SELECT 'agency_admin', id FROM permissions 
WHERE module IN ('dashboard', 'campaigns', 'templates', 'audiences', 'giftcards', 'calls', 'settings', 'users', 'clients', 'analytics', 'leads');

-- Client User gets basic access
INSERT INTO role_permissions (role, permission_id)
SELECT 'client_user', id FROM permissions 
WHERE name IN (
  'dashboard.view', 'campaigns.view', 'campaigns.create', 'campaigns.edit',
  'templates.view', 'templates.create', 'templates.edit',
  'audiences.view', 'audiences.create', 'audiences.import',
  'analytics.view', 'settings.view'
);

-- Enable RLS on permission_templates
ALTER TABLE permission_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permission templates"
ON permission_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage permission templates"
ON permission_templates FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin') OR 
  has_role(auth.uid(), 'org_admin')
);