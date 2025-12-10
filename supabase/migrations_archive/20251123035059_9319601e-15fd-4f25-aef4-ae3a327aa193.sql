-- Fix admin permissions: Ensure admin role has full access to all tables

-- Update recipient_audit_log RLS policies to allow admin full access
DROP POLICY IF EXISTS "Users can view own audit logs" ON recipient_audit_log;
DROP POLICY IF EXISTS "Users can insert audit logs" ON recipient_audit_log;

CREATE POLICY "Admin and call center can view all audit logs"
ON recipient_audit_log FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'call_center') OR
  has_role(auth.uid(), 'company_owner') OR
  performed_by_user_id = auth.uid()
);

CREATE POLICY "Authenticated users can insert audit logs"
ON recipient_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update recipients table RLS to allow admin full access
DROP POLICY IF EXISTS "Users can view own recipients" ON recipients;
DROP POLICY IF EXISTS "Users can update own recipients" ON recipients;

CREATE POLICY "Admin has full access to recipients"
ON recipients FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'company_owner') OR
  has_role(auth.uid(), 'call_center')
);

-- Update gift_cards RLS policies for admin access
DROP POLICY IF EXISTS "Users can view assigned cards" ON gift_cards;

CREATE POLICY "Admin and call center can view all cards"
ON gift_cards FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'company_owner') OR
  has_role(auth.uid(), 'call_center')
);

CREATE POLICY "Admin can manage all cards"
ON gift_cards FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update gift_card_pools RLS for admin access
DROP POLICY IF EXISTS "Users can view pools" ON gift_card_pools;

CREATE POLICY "Admin has full access to pools"
ON gift_card_pools FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'company_owner')
);

-- Update gift_card_deliveries RLS for admin access
DROP POLICY IF EXISTS "Users can view deliveries" ON gift_card_deliveries;

CREATE POLICY "Admin and call center can view all deliveries"
ON gift_card_deliveries FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'company_owner') OR
  has_role(auth.uid(), 'call_center')
);

CREATE POLICY "Admin can manage deliveries"
ON gift_card_deliveries FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update call_sessions RLS for admin access
CREATE POLICY "Admin can view all call sessions"
ON call_sessions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'company_owner') OR
  has_role(auth.uid(), 'call_center')
);

CREATE POLICY "Admin can manage call sessions"
ON call_sessions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update bulk_code_uploads RLS for admin access
CREATE POLICY "Admin can view all bulk uploads"
ON bulk_code_uploads FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'company_owner')
);

CREATE POLICY "Admin can manage bulk uploads"
ON bulk_code_uploads FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));