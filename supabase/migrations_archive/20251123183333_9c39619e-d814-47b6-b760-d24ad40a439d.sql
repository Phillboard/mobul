-- Phase 1 & 2: Performance Optimization & Security Hardening

-- ====================
-- PERFORMANCE: Add Database Indexes
-- ====================

-- Gift Cards module (high traffic)
CREATE INDEX IF NOT EXISTS idx_gift_cards_pool_status 
  ON gift_cards(pool_id, status) WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_gift_cards_claimed_recipient 
  ON gift_cards(claimed_by_recipient_id) WHERE claimed_by_recipient_id IS NOT NULL;

-- Campaigns (frequently filtered)
CREATE INDEX IF NOT EXISTS idx_campaigns_client_status 
  ON campaigns(client_id, status);

CREATE INDEX IF NOT EXISTS idx_campaign_conditions_active 
  ON campaign_conditions(campaign_id, is_active) WHERE is_active = true;

-- Recipients (high volume)
CREATE INDEX IF NOT EXISTS idx_recipients_audience 
  ON recipients(audience_id);

CREATE INDEX IF NOT EXISTS idx_recipients_token 
  ON recipients(token) WHERE token IS NOT NULL;

-- Events (analytics queries)
CREATE INDEX IF NOT EXISTS idx_events_campaign_type_occurred 
  ON events(campaign_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_recipient_occurred 
  ON events(recipient_id, occurred_at DESC);

-- Call Sessions
CREATE INDEX IF NOT EXISTS idx_call_sessions_campaign_status 
  ON call_sessions(campaign_id, call_status, created_at DESC);

-- Ace Forms
CREATE INDEX IF NOT EXISTS idx_ace_form_submissions_form_date 
  ON ace_form_submissions(form_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ace_forms_client_active 
  ON ace_forms(client_id, is_active) WHERE is_active = true;

-- Gift Card Deliveries
CREATE INDEX IF NOT EXISTS idx_gift_card_deliveries_recipient 
  ON gift_card_deliveries(recipient_id, created_at DESC);

-- Call Conditions Met
CREATE INDEX IF NOT EXISTS idx_call_conditions_met_campaign 
  ON call_conditions_met(campaign_id, created_at DESC);

-- ====================
-- SECURITY: Password Protection
-- ====================

-- Create a function to validate password strength
CREATE OR REPLACE FUNCTION validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Minimum 8 characters
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one lowercase letter
  IF NOT password ~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one uppercase letter  
  IF NOT password ~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one number
  IF NOT password ~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION validate_password_strength IS 
  'Validates password meets minimum requirements: 8+ chars, lowercase, uppercase, and number';

-- ====================
-- SECURITY: Fix RLS Policies for Admin Access
-- ====================

-- Ensure gift_card_deliveries has admin policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gift_card_deliveries' 
    AND policyname = 'Admins can manage all deliveries'
  ) THEN
    CREATE POLICY "Admins can manage all deliveries" ON gift_card_deliveries
    FOR ALL USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Ensure recipient_audit_log has admin policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipient_audit_log' 
    AND policyname = 'Admins can view all audit logs'
  ) THEN
    CREATE POLICY "Admins can view all audit logs" ON recipient_audit_log
    FOR SELECT USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;