-- Fix call center permissions for Mike demo
-- Grant call center permissions to ALL appropriate roles

-- Ensure the permissions exist in role_permissions table
-- Grant to ALL roles that might need call center access
INSERT INTO role_permissions (role, permission)
VALUES 
  -- Admin (full access)
  ('admin', 'calls.confirm_redemption'),
  ('admin', 'calls.manage'),
  
  -- Call center agents
  ('call_center_agent', 'calls.confirm_redemption'),
  ('call_center_agent', 'calls.manage'),
  
  -- Agency roles
  ('agency_owner', 'calls.confirm_redemption'),
  ('agency_user', 'calls.confirm_redemption'),
  ('agency_admin', 'calls.confirm_redemption'),
  
  -- Client roles
  ('client_user', 'calls.confirm_redemption'),
  ('client_admin', 'calls.confirm_redemption'),
  ('company_owner', 'calls.confirm_redemption'),
  
  -- Catch-all for any user role
  ('user', 'calls.confirm_redemption')
ON CONFLICT (role, permission) DO NOTHING;

-- Add comment explaining the permissions
COMMENT ON TABLE role_permissions IS 'Defines which permissions are available to each role. calls.confirm_redemption allows access to call center redemption panel.';

-- Verify permissions were added
DO $$
BEGIN
  RAISE NOTICE 'Call center permissions granted. Total permissions: %', 
    (SELECT COUNT(*) FROM role_permissions WHERE permission LIKE '%call%');
END $$;

