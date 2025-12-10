-- Assign landing pages permissions to roles

-- Add all landing pages permissions to platform_admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'platform_admin'::app_role, id FROM permissions WHERE module = 'landingpages'
ON CONFLICT DO NOTHING;

-- Add all landing pages permissions to org_admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'org_admin'::app_role, id FROM permissions WHERE module = 'landingpages'
ON CONFLICT DO NOTHING;

-- Add all landing pages permissions to agency_admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'agency_admin'::app_role, id FROM permissions WHERE module = 'landingpages'
ON CONFLICT DO NOTHING;

-- Add view-only landing pages permission to client_user
INSERT INTO role_permissions (role, permission_id)
SELECT 'client_user'::app_role, id FROM permissions 
WHERE module = 'landingpages' AND name = 'landingpages.view'
ON CONFLICT DO NOTHING;