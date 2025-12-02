-- Fix call center permissions for Mike demo
-- Grant call center permissions to appropriate roles

-- Ensure the permissions exist in role_permissions table
-- Grant to call_center_agent role (if it exists)
INSERT INTO role_permissions (role, permission)
VALUES 
  ('call_center_agent', 'calls.confirm_redemption'),
  ('call_center_agent', 'calls.manage')
ON CONFLICT (role, permission) DO NOTHING;

-- Grant to client_user role so clients can access call center
INSERT INTO role_permissions (role, permission)
VALUES 
  ('client_user', 'calls.confirm_redemption')
ON CONFLICT (role, permission) DO NOTHING;

-- Grant to agency_user role so agency staff can access call center
INSERT INTO role_permissions (role, permission)
VALUES 
  ('agency_user', 'calls.confirm_redemption')
ON CONFLICT (role, permission) DO NOTHING;

-- Grant to admin role (full access)
INSERT INTO role_permissions (role, permission)
VALUES 
  ('admin', 'calls.confirm_redemption'),
  ('admin', 'calls.manage')
ON CONFLICT (role, permission) DO NOTHING;

-- Add comment explaining the permissions
COMMENT ON TABLE role_permissions IS 'Defines which permissions are available to each role. calls.confirm_redemption allows access to call center redemption panel.';

