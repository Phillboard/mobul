-- ============================================================
-- MIGRATION: Permission System Overhaul
-- Seeds permission registry + role defaults + flexibility layer
-- ============================================================

-- ============================================================
-- PART 1: Add category column to permissions table (if not exists)
-- ============================================================

-- Add category column for UI grouping (module is legacy, category is new)
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS category TEXT;

-- ============================================================
-- PART 2: Seed all permission definitions
-- ============================================================

INSERT INTO permissions (name, description, module, category) VALUES
  -- Dashboard
  ('dashboard.view', 'View main dashboard', 'dashboard', 'Dashboard'),
  ('dashboard.platform_view', 'View platform-wide dashboard', 'dashboard', 'Dashboard'),
  -- Campaigns
  ('campaigns.view', 'View campaigns', 'campaigns', 'Campaigns'),
  ('campaigns.create', 'Create new campaigns', 'campaigns', 'Campaigns'),
  ('campaigns.edit', 'Edit existing campaigns', 'campaigns', 'Campaigns'),
  ('campaigns.delete', 'Delete campaigns', 'campaigns', 'Campaigns'),
  ('campaigns.analytics', 'View campaign analytics', 'campaigns', 'Campaigns'),
  -- Templates
  ('templates.view', 'View mail templates', 'templates', 'Templates'),
  ('templates.create', 'Create mail templates', 'templates', 'Templates'),
  ('templates.edit', 'Edit mail templates', 'templates', 'Templates'),
  ('templates.delete', 'Delete mail templates', 'templates', 'Templates'),
  -- Landing Pages
  ('landingpages.view', 'View landing pages', 'landingpages', 'Landing Pages'),
  ('landingpages.create', 'Create landing pages', 'landingpages', 'Landing Pages'),
  ('landingpages.edit', 'Edit landing pages', 'landingpages', 'Landing Pages'),
  ('landingpages.delete', 'Delete landing pages', 'landingpages', 'Landing Pages'),
  -- Contacts
  ('contacts.view', 'View contacts', 'contacts', 'Contacts'),
  ('contacts.create', 'Create contacts', 'contacts', 'Contacts'),
  ('contacts.edit', 'Edit contacts', 'contacts', 'Contacts'),
  ('contacts.delete', 'Delete contacts', 'contacts', 'Contacts'),
  ('contacts.import', 'Import contacts', 'contacts', 'Contacts'),
  ('contacts.export', 'Export contacts', 'contacts', 'Contacts'),
  -- Audiences
  ('audiences.view', 'View audiences', 'audiences', 'Audiences'),
  ('audiences.create', 'Create audiences', 'audiences', 'Audiences'),
  ('audiences.manage', 'Manage audiences', 'audiences', 'Audiences'),
  -- Gift Cards
  ('gift_cards.view', 'View gift cards', 'gift_cards', 'Gift Cards'),
  ('gift_cards.manage_pools', 'Manage gift card pools', 'gift_cards', 'Gift Cards'),
  ('gift_cards.purchase', 'Purchase gift cards', 'gift_cards', 'Gift Cards'),
  ('gift_cards.marketplace_admin', 'Administer gift card marketplace', 'gift_cards', 'Gift Cards'),
  ('gift_cards.record_purchase', 'Record gift card purchases', 'gift_cards', 'Gift Cards'),
  ('gift_cards.pricing', 'Manage gift card pricing', 'gift_cards', 'Gift Cards'),
  ('gift_cards.brand_management', 'Manage gift card brands', 'gift_cards', 'Gift Cards'),
  ('gift_cards.assign_to_campaign', 'Assign gift cards to campaigns', 'gift_cards', 'Gift Cards'),
  ('gift_cards.redeem', 'Redeem gift cards', 'gift_cards', 'Gift Cards'),
  ('gift_cards.view_redemptions', 'View gift card redemptions', 'gift_cards', 'Gift Cards'),
  ('gift_cards.upload', 'Upload gift cards', 'gift_cards', 'Gift Cards'),
  ('gift_cards.delivery_history', 'View gift card delivery history', 'gift_cards', 'Gift Cards'),
  -- Billing
  ('billing.view', 'View billing information', 'billing', 'Billing'),
  ('billing.manage', 'Manage billing', 'billing', 'Billing'),
  ('credits.view', 'View credits', 'billing', 'Billing'),
  ('credits.manage', 'Manage credits', 'billing', 'Billing'),
  -- Call Center
  ('calls.view', 'View call center', 'calls', 'Call Center'),
  ('calls.confirm_redemption', 'Confirm redemptions in call center', 'calls', 'Call Center'),
  ('calls.manage', 'Manage call center scripts', 'calls', 'Call Center'),
  -- Forms
  ('forms.view', 'View forms', 'forms', 'Forms'),
  ('forms.create', 'Create forms', 'forms', 'Forms'),
  ('forms.edit', 'Edit forms', 'forms', 'Forms'),
  ('forms.delete', 'Delete forms', 'forms', 'Forms'),
  ('forms.analytics', 'View form analytics', 'forms', 'Forms'),
  -- Users
  ('users.view', 'View users', 'users', 'Users'),
  ('users.manage', 'Manage users', 'users', 'Users'),
  ('users.invite', 'Invite users', 'users', 'Users'),
  ('users.delete', 'Delete users', 'users', 'Users'),
  -- Team
  ('team.view', 'View team', 'team', 'Team'),
  ('team.manage', 'Manage team', 'team', 'Team'),
  ('activities.view', 'View activities', 'team', 'Team'),
  ('tasks.view', 'View tasks', 'team', 'Team'),
  ('tasks.manage', 'Manage tasks', 'team', 'Team'),
  -- Agencies
  ('agencies.view', 'View agencies', 'agencies', 'Agencies'),
  ('agencies.create', 'Create agencies', 'agencies', 'Agencies'),
  ('agencies.manage', 'Manage agencies', 'agencies', 'Agencies'),
  -- Settings
  ('settings.general', 'View general settings', 'settings', 'Settings'),
  ('settings.billing', 'View billing settings', 'settings', 'Settings'),
  ('settings.security.view', 'View security settings', 'settings', 'Settings'),
  ('platform.security.manage', 'Manage platform security', 'settings', 'Settings'),
  ('settings.notifications', 'Manage notification settings', 'settings', 'Settings'),
  ('settings.integrations', 'View integration settings', 'settings', 'Settings'),
  ('settings.api', 'Manage API settings', 'settings', 'Settings'),
  -- Analytics
  ('analytics.view', 'View analytics', 'analytics', 'Analytics'),
  ('analytics.export', 'Export analytics data', 'analytics', 'Analytics'),
  ('reports.view', 'View reports', 'analytics', 'Analytics'),
  ('reports.financial', 'View financial reports', 'analytics', 'Analytics'),
  -- Integrations
  ('integrations.view', 'View integrations', 'integrations', 'Integrations'),
  ('integrations.manage', 'Manage integrations', 'integrations', 'Integrations'),
  ('api.view', 'View API documentation', 'integrations', 'Integrations'),
  ('api.manage', 'Manage API keys', 'integrations', 'Integrations'),
  -- Admin
  ('admin.system_health', 'View system health', 'admin', 'Admin'),
  ('admin.audit_log', 'View audit log', 'admin', 'Admin'),
  ('admin.error_logs', 'View error logs', 'admin', 'Admin'),
  ('admin.demo_data', 'Generate demo data', 'admin', 'Admin'),
  ('admin.site_directory', 'View site directory', 'admin', 'Admin'),
  ('admin.organizations', 'Manage organizations', 'admin', 'Admin'),
  -- Docs
  ('docs.view', 'View documentation', 'docs', 'Documentation'),
  ('docs.manage', 'Manage documentation', 'docs', 'Documentation')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module,
  category = EXCLUDED.category;

-- ============================================================
-- PART 3: Seed role_permissions for each role
-- ============================================================

-- First, clear existing role_permissions to ensure clean state
-- (This is safe because we're re-seeding all permissions)
DELETE FROM role_permissions;

-- Admin gets ALL permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM permissions;

-- Tech Support — view permissions only
INSERT INTO role_permissions (role, permission_id)
SELECT 'tech_support'::app_role, id FROM permissions WHERE name IN (
  'dashboard.view', 'dashboard.platform_view', 'campaigns.view', 'campaigns.analytics',
  'templates.view', 'landingpages.view', 'contacts.view', 'audiences.view',
  'gift_cards.view', 'gift_cards.view_redemptions', 'gift_cards.delivery_history',
  'billing.view', 'credits.view', 'calls.view', 'forms.view', 'forms.analytics',
  'users.view', 'team.view', 'activities.view', 'tasks.view', 'agencies.view',
  'settings.general', 'settings.security.view', 'analytics.view', 'reports.view',
  'integrations.view', 'api.view', 'admin.system_health', 'admin.audit_log',
  'admin.error_logs', 'docs.view'
);

-- Agency Owner — campaign/client management
INSERT INTO role_permissions (role, permission_id)
SELECT 'agency_owner'::app_role, id FROM permissions WHERE name IN (
  'dashboard.view',
  'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.delete', 'campaigns.analytics',
  'templates.view', 'templates.create', 'templates.edit', 'templates.delete',
  'landingpages.view', 'landingpages.create', 'landingpages.edit', 'landingpages.delete',
  'contacts.view', 'contacts.create', 'contacts.edit', 'contacts.delete', 'contacts.import', 'contacts.export',
  'audiences.view', 'audiences.create', 'audiences.manage',
  'gift_cards.view', 'gift_cards.manage_pools', 'gift_cards.purchase', 'gift_cards.assign_to_campaign',
  'gift_cards.redeem', 'gift_cards.view_redemptions', 'gift_cards.upload', 'gift_cards.delivery_history',
  'billing.view', 'billing.manage', 'credits.view', 'credits.manage',
  'calls.view', 'calls.confirm_redemption', 'calls.manage',
  'forms.view', 'forms.create', 'forms.edit', 'forms.delete', 'forms.analytics',
  'users.view', 'users.manage', 'users.invite',
  'team.view', 'team.manage', 'activities.view', 'tasks.view', 'tasks.manage',
  'settings.general', 'settings.billing', 'settings.notifications', 'settings.integrations',
  'analytics.view', 'analytics.export', 'reports.view',
  'integrations.view', 'integrations.manage', 'api.view',
  'docs.view'
);

-- Client Owner (company_owner) — their client only
INSERT INTO role_permissions (role, permission_id)
SELECT 'company_owner'::app_role, id FROM permissions WHERE name IN (
  'dashboard.view',
  'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.delete', 'campaigns.analytics',
  'templates.view', 'templates.create', 'templates.edit',
  'landingpages.view', 'landingpages.create', 'landingpages.edit',
  'contacts.view', 'contacts.create', 'contacts.edit', 'contacts.delete', 'contacts.import', 'contacts.export',
  'audiences.view', 'audiences.create', 'audiences.manage',
  'gift_cards.view', 'gift_cards.assign_to_campaign', 'gift_cards.redeem', 'gift_cards.view_redemptions',
  'billing.view', 'credits.view',
  'calls.view', 'calls.confirm_redemption',
  'forms.view', 'forms.create', 'forms.edit', 'forms.analytics',
  'users.view', 'users.invite',
  'team.view', 'activities.view', 'tasks.view', 'tasks.manage',
  'settings.general', 'settings.notifications',
  'analytics.view', 'reports.view',
  'docs.view'
);

-- Developer — API/integration focused
INSERT INTO role_permissions (role, permission_id)
SELECT 'developer'::app_role, id FROM permissions WHERE name IN (
  'dashboard.view',
  'api.view', 'api.manage',
  'integrations.view', 'integrations.manage',
  'settings.api', 'settings.integrations',
  'docs.view', 'analytics.view',
  'campaigns.view', 'contacts.view', 'templates.view', 'forms.view'
);

-- Call Center — redemption only
INSERT INTO role_permissions (role, permission_id)
SELECT 'call_center'::app_role, id FROM permissions WHERE name IN (
  'dashboard.view',
  'calls.view', 'calls.confirm_redemption',
  'gift_cards.redeem', 'gift_cards.view_redemptions',
  'docs.view'
);

-- ============================================================
-- PART 4: org_permission_overrides table (Flexibility Layer)
-- ============================================================
-- 
-- This table lets you override the default role permissions for a specific agency.
-- Example: Agency "Solar Kings" doesn't want their client owners to export contacts.
-- 
-- Insert: { agency_id: 'solar-kings-id', role: 'company_owner', permission_name: 'contacts.export', granted: false }
-- 
-- The `granted` boolean means:
--   true  = GRANT this permission even if the role default doesn't include it
--   false = REVOKE this permission even if the role default includes it

CREATE TABLE IF NOT EXISTS org_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  UNIQUE(agency_id, role, permission_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_perm_overrides_agency ON org_permission_overrides(agency_id);
CREATE INDEX IF NOT EXISTS idx_org_perm_overrides_role ON org_permission_overrides(agency_id, role);

-- Enable RLS
ALTER TABLE org_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "admins_full_access_org_overrides" ON org_permission_overrides;
DROP POLICY IF EXISTS "agency_owners_view_own_overrides" ON org_permission_overrides;

-- Admins have full access
CREATE POLICY "admins_full_access_org_overrides" ON org_permission_overrides
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Agency owners can view their own agency's overrides
CREATE POLICY "agency_owners_view_own_overrides" ON org_permission_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_agencies ua ON ur.user_id = ua.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'agency_owner'
        AND ua.agency_id = org_permission_overrides.agency_id
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_org_permission_overrides_timestamp ON org_permission_overrides;
CREATE TRIGGER update_org_permission_overrides_timestamp
  BEFORE UPDATE ON org_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE org_permission_overrides IS 
  'Per-agency permission overrides. Allows customizing what each role can do within a specific agency. Checked AFTER user_permissions but BEFORE role_permissions defaults.';

-- ============================================================
-- PART 5: Verify the seed worked
-- ============================================================

-- This will output counts for verification (visible in migration logs)
DO $$
DECLARE
  perm_count INTEGER;
  admin_count INTEGER;
  tech_support_count INTEGER;
  agency_owner_count INTEGER;
  company_owner_count INTEGER;
  developer_count INTEGER;
  call_center_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perm_count FROM permissions;
  SELECT COUNT(*) INTO admin_count FROM role_permissions WHERE role = 'admin';
  SELECT COUNT(*) INTO tech_support_count FROM role_permissions WHERE role = 'tech_support';
  SELECT COUNT(*) INTO agency_owner_count FROM role_permissions WHERE role = 'agency_owner';
  SELECT COUNT(*) INTO company_owner_count FROM role_permissions WHERE role = 'company_owner';
  SELECT COUNT(*) INTO developer_count FROM role_permissions WHERE role = 'developer';
  SELECT COUNT(*) INTO call_center_count FROM role_permissions WHERE role = 'call_center';
  
  RAISE NOTICE 'Permission System Seeded:';
  RAISE NOTICE '  Total permissions: %', perm_count;
  RAISE NOTICE '  Admin permissions: % (should be %)', admin_count, perm_count;
  RAISE NOTICE '  Tech Support permissions: %', tech_support_count;
  RAISE NOTICE '  Agency Owner permissions: %', agency_owner_count;
  RAISE NOTICE '  Company Owner permissions: %', company_owner_count;
  RAISE NOTICE '  Developer permissions: %', developer_count;
  RAISE NOTICE '  Call Center permissions: %', call_center_count;
END $$;
