-- Security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_security_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_action ON security_audit_log(action_type);
CREATE INDEX idx_security_audit_created ON security_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view all security logs"
  ON security_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON security_audit_log FOR INSERT
  WITH CHECK (true);

-- Add additional settings permissions
INSERT INTO permissions (name, description, module) VALUES
  ('settings.general.edit', 'Edit general settings', 'settings'),
  ('settings.security.view', 'View security audit logs', 'settings'),
  ('platform.api.manage', 'Manage platform API settings', 'platform')
ON CONFLICT (name) DO NOTHING;