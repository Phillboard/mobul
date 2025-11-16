-- Create user invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  role app_role NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
CREATE POLICY "Admins can view invitations"
ON user_invitations FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin') OR
  has_role(auth.uid(), 'org_admin') OR
  has_role(auth.uid(), 'agency_admin')
);

CREATE POLICY "Admins can create invitations"
ON user_invitations FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'platform_admin') OR
  has_role(auth.uid(), 'org_admin') OR
  has_role(auth.uid(), 'agency_admin')
);

CREATE POLICY "Admins can update invitations"
ON user_invitations FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin') OR
  has_role(auth.uid(), 'org_admin') OR
  has_role(auth.uid(), 'agency_admin')
);

CREATE POLICY "Public can view own invitation by token"
ON user_invitations FOR SELECT
TO anon
USING (true);

-- Create index for token lookups
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;