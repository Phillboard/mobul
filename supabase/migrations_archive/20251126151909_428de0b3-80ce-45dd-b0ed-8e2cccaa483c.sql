-- Add role column to user_invitations table
ALTER TABLE user_invitations 
ADD COLUMN role app_role NOT NULL DEFAULT 'company_owner'::app_role;

-- Add RLS policies for invitation management
CREATE POLICY "Users can view invitations they sent"
ON user_invitations FOR SELECT
TO authenticated
USING (invited_by = auth.uid());

CREATE POLICY "Admins can view all invitations"
ON user_invitations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create invitations"
ON user_invitations FOR INSERT
TO authenticated
WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Admins can update invitations"
ON user_invitations FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));