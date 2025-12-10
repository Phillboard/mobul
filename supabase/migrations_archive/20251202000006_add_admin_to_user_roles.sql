-- Insert admin role into user_roles table (not metadata)
-- This is where the AuthContext actually checks for admin role

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@mopads.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it was added
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE u.email = 'admin@mopads.com' AND ur.role = 'admin';
  
  IF role_count > 0 THEN
    RAISE NOTICE 'Successfully added admin role to admin@mopads.com';
  ELSE
    RAISE NOTICE 'Warning: Could not add admin role';
  END IF;
END $$;

