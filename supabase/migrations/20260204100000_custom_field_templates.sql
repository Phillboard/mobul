-- ============================================================================
-- Custom Field Templates + Campaign Field Selection
-- ============================================================================
-- Allows agencies to define reusable field templates (e.g., "Roofing Fields",
-- "Auto Warranty Fields") that clients can apply to create custom field
-- definitions. Campaigns can optionally specify which custom fields are
-- relevant for their workflow.
-- ============================================================================

-- 1. Agency-level field templates
CREATE TABLE IF NOT EXISTS custom_field_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique template names per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_field_templates_org_name
  ON custom_field_templates(org_id, template_name)
  WHERE is_active = true;

-- Index for active templates by org
CREATE INDEX IF NOT EXISTS idx_custom_field_templates_org_active
  ON custom_field_templates(org_id)
  WHERE is_active = true;

-- Comments
COMMENT ON TABLE custom_field_templates IS 'Agency-level reusable custom field templates';
COMMENT ON COLUMN custom_field_templates.fields IS 'JSON array of field definitions: [{field_name, field_label, field_type, options, is_required, field_group, ...}]';
COMMENT ON COLUMN custom_field_templates.industry IS 'Optional industry tag (e.g., roofing, auto, insurance)';

-- 2. Enable RLS
ALTER TABLE custom_field_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can read templates for their org
CREATE POLICY "Users can view templates for their org"
  ON custom_field_templates
  FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- RLS: Only org owners can create/update/delete templates
CREATE POLICY "Org owners can manage templates"
  ON custom_field_templates
  FOR ALL
  USING (
    org_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'agency_owner')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'agency_owner')
    )
  );

-- 3. Campaign-level custom field selection
-- Allows campaigns to specify which custom fields are relevant
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS custom_field_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN campaigns.custom_field_ids IS 'Optional array of contact_custom_field_definitions IDs relevant to this campaign. Empty = show all client fields.';

-- 4. Add custom field permissions to the permissions table
INSERT INTO permissions (name, description, category)
VALUES
  ('custom_fields.view', 'View custom field definitions and values', 'Custom Fields'),
  ('custom_fields.manage', 'Create, edit, and delete custom field definitions', 'Custom Fields'),
  ('custom_fields.fill', 'Fill in custom field values during calls or form submissions', 'Custom Fields')
ON CONFLICT (name) DO NOTHING;

-- 5. Assign custom field permissions to roles
-- Admin gets all (already gets everything via Object.values(P))
-- Agency Owner: view, manage, fill
INSERT INTO role_permissions (role, permission_id)
SELECT 'agency_owner', p.id
FROM permissions p
WHERE p.name IN ('custom_fields.view', 'custom_fields.manage', 'custom_fields.fill')
ON CONFLICT DO NOTHING;

-- Company Owner: view, manage, fill
INSERT INTO role_permissions (role, permission_id)
SELECT 'company_owner', p.id
FROM permissions p
WHERE p.name IN ('custom_fields.view', 'custom_fields.manage', 'custom_fields.fill')
ON CONFLICT DO NOTHING;

-- Developer: view only
INSERT INTO role_permissions (role, permission_id)
SELECT 'developer', p.id
FROM permissions p
WHERE p.name = 'custom_fields.view'
ON CONFLICT DO NOTHING;

-- Call Center: view and fill
INSERT INTO role_permissions (role, permission_id)
SELECT 'call_center', p.id
FROM permissions p
WHERE p.name IN ('custom_fields.view', 'custom_fields.fill')
ON CONFLICT DO NOTHING;

-- 6. Add call_notes column to recipients for storing notes from calls
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS last_call_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ;

COMMENT ON COLUMN recipients.last_call_notes IS 'Free-form notes from the most recent call center interaction';
COMMENT ON COLUMN recipients.last_call_at IS 'Timestamp of the most recent call center interaction';
