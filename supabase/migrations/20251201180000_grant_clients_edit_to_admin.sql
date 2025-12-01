-- Grant clients.edit permission to admin role
-- This allows admins to edit organization/client information including name

INSERT INTO role_permissions (role, permission_id)
SELECT 'admin'::app_role, p.id
FROM permissions p
WHERE p.name = 'clients.edit'
ON CONFLICT (role, permission_id) DO NOTHING;

