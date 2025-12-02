-- ADD VERIFICATION AND DISPOSITION COLUMNS
-- 
-- This migration adds columns for tracking:
-- 1. How the customer was verified (SMS, email, skipped)
-- 2. The disposition of the call (positive or negative outcomes)
-- 3. Admin alerts for oversight
--
-- RUN IN SUPABASE SQL EDITOR

-- ============================================
-- STEP 1: Add columns to recipients table
-- ============================================

-- Verification method: how was the customer verified?
ALTER TABLE recipients 
  ADD COLUMN IF NOT EXISTS verification_method TEXT;

-- Disposition: what was the outcome?
ALTER TABLE recipients 
  ADD COLUMN IF NOT EXISTS disposition TEXT;

-- Email verification tracking
ALTER TABLE recipients 
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

ALTER TABLE recipients 
  ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

ALTER TABLE recipients 
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN recipients.verification_method IS 'How the customer was verified: sms, email, or skipped';
COMMENT ON COLUMN recipients.disposition IS 'Call disposition: verified_verbally, already_opted_in, vip_customer, do_not_call, not_interested, wrong_number, call_back_later, invalid_contact';
COMMENT ON COLUMN recipients.email_verification_token IS 'Token for email verification link';
COMMENT ON COLUMN recipients.email_verification_sent_at IS 'When verification email was sent';
COMMENT ON COLUMN recipients.email_verified_at IS 'When customer verified via email';

-- ============================================
-- STEP 2: Create admin_alerts table for logging
-- ============================================

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  alert_type TEXT NOT NULL,
  recipient_id UUID REFERENCES recipients(id),
  campaign_id UUID REFERENCES campaigns(id),
  agent_id UUID REFERENCES profiles(id),
  disposition TEXT,
  customer_name TEXT,
  customer_code TEXT,
  additional_info JSONB,
  sent_to TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id)
);

-- Add RLS policies for admin_alerts
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view alerts (admin filtering done in app layer)
CREATE POLICY "Authenticated users can view alerts"
  ON admin_alerts FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role and authenticated users to insert alerts
CREATE POLICY "Allow insert alerts"
  ON admin_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update/acknowledge alerts
CREATE POLICY "Allow update alerts"
  ON admin_alerts FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_recipients_verification_method 
  ON recipients(verification_method) 
  WHERE verification_method IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_disposition 
  ON recipients(disposition) 
  WHERE disposition IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_email_verification_token 
  ON recipients(email_verification_token) 
  WHERE email_verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at 
  ON admin_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_alert_type 
  ON admin_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_unacknowledged 
  ON admin_alerts(created_at) 
  WHERE acknowledged_at IS NULL;

-- ============================================
-- STEP 4: Verification query
-- ============================================

SELECT 
  'Column Check' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'recipients'
  AND column_name IN ('verification_method', 'disposition', 'email_verification_token');

