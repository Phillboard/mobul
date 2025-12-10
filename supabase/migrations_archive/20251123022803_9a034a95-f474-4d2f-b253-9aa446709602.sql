-- =============================================
-- CUSTOMER CODE REDEMPTION SYSTEM SCHEMA
-- Two-tier code system for call center approval workflow
-- =============================================

-- 1. Update recipients table with approval and redemption fields
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'redeemed')),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_call_session_id UUID REFERENCES call_sessions(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS gift_card_assigned_id UUID REFERENCES gift_cards(id),
  ADD COLUMN IF NOT EXISTS redemption_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS redemption_ip TEXT,
  ADD COLUMN IF NOT EXISTS redemption_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS redemption_completed_at TIMESTAMP WITH TIME ZONE;

-- Populate redemption_code from existing token if not set
UPDATE recipients SET redemption_code = token WHERE redemption_code IS NULL AND token IS NOT NULL;

-- Create index for fast lookup by redemption code
CREATE INDEX IF NOT EXISTS idx_recipients_redemption_code ON recipients(redemption_code);
CREATE INDEX IF NOT EXISTS idx_recipients_approval_status ON recipients(approval_status);
CREATE INDEX IF NOT EXISTS idx_recipients_phone ON recipients(phone);

-- 2. Create recipient_audit_log table for complete tracking
CREATE TABLE IF NOT EXISTS recipient_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('uploaded', 'approved', 'rejected', 'redeemed', 'viewed', 'gift_card_assigned', 'sms_sent', 'email_sent')),
  performed_by_user_id UUID REFERENCES auth.users(id),
  call_session_id UUID REFERENCES call_sessions(id),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on recipient_audit_log
ALTER TABLE recipient_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for recipients in accessible clients
CREATE POLICY "Users can view audit logs for accessible clients"
  ON recipient_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipients r
      JOIN audiences a ON a.id = r.audience_id
      WHERE r.id = recipient_audit_log.recipient_id
        AND user_can_access_client(auth.uid(), a.client_id)
    )
  );

-- Policy: System and authenticated users can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON recipient_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_recipient_audit_log_recipient ON recipient_audit_log(recipient_id);
CREATE INDEX IF NOT EXISTS idx_recipient_audit_log_action ON recipient_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_recipient_audit_log_created ON recipient_audit_log(created_at DESC);

-- 3. Create bulk_code_uploads table for tracking CSV imports
CREATE TABLE IF NOT EXISTS bulk_code_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  audience_id UUID REFERENCES audiences(id) ON DELETE SET NULL,
  uploaded_by_user_id UUID REFERENCES auth.users(id) NOT NULL,
  file_name TEXT NOT NULL,
  total_codes INTEGER NOT NULL DEFAULT 0,
  successful_codes INTEGER NOT NULL DEFAULT 0,
  duplicate_codes INTEGER NOT NULL DEFAULT 0,
  error_codes INTEGER NOT NULL DEFAULT 0,
  upload_status TEXT NOT NULL DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed')),
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on bulk_code_uploads
ALTER TABLE bulk_code_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view uploads for accessible clients
CREATE POLICY "Users can view uploads for accessible clients"
  ON bulk_code_uploads
  FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

-- Policy: Users can create uploads for accessible clients
CREATE POLICY "Users can create uploads for accessible clients"
  ON bulk_code_uploads
  FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

-- Create indexes for upload tracking
CREATE INDEX IF NOT EXISTS idx_bulk_code_uploads_client ON bulk_code_uploads(client_id);
CREATE INDEX IF NOT EXISTS idx_bulk_code_uploads_campaign ON bulk_code_uploads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bulk_code_uploads_created ON bulk_code_uploads(created_at DESC);

-- 4. Add helper function to generate unique redemption codes
CREATE OR REPLACE FUNCTION generate_redemption_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substring(encode(extensions.gen_random_bytes(6), 'base64') from 1 for 8));
    code := REPLACE(code, '/', '');
    code := REPLACE(code, '+', '');
    code := REPLACE(code, '=', '');
    
    -- Ensure uniqueness
    IF NOT EXISTS (SELECT 1 FROM recipients WHERE redemption_code = code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$;