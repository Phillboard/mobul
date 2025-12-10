-- =====================================================
-- ADD AUTO-RELOAD FUNCTIONALITY TO CREDIT ACCOUNTS
-- =====================================================
-- This migration adds columns needed for auto-reload billing
-- When balance drops below threshold, automatically charge card
-- =====================================================

-- Add auto-reload columns to credit_accounts table
ALTER TABLE credit_accounts
ADD COLUMN IF NOT EXISTS auto_reload_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_reload_threshold NUMERIC(12,2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS auto_reload_amount NUMERIC(12,2) DEFAULT 500,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS last_auto_reload_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_reload_failure_count INTEGER DEFAULT 0;

-- Add index for finding accounts that need auto-reload
CREATE INDEX IF NOT EXISTS idx_credit_accounts_auto_reload 
  ON credit_accounts(auto_reload_enabled, total_remaining)
  WHERE auto_reload_enabled = TRUE;

-- Add index for Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_credit_accounts_stripe_customer 
  ON credit_accounts(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN credit_accounts.auto_reload_enabled IS 'Whether automatic recharge is enabled when balance falls below threshold';
COMMENT ON COLUMN credit_accounts.auto_reload_threshold IS 'Balance threshold that triggers auto-reload (default $100)';
COMMENT ON COLUMN credit_accounts.auto_reload_amount IS 'Amount to add when auto-reload is triggered (default $500)';
COMMENT ON COLUMN credit_accounts.stripe_customer_id IS 'Stripe Customer ID for auto-reload charges';
COMMENT ON COLUMN credit_accounts.stripe_payment_method_id IS 'Default payment method for auto-reload';
COMMENT ON COLUMN credit_accounts.last_auto_reload_at IS 'Timestamp of last successful auto-reload';
COMMENT ON COLUMN credit_accounts.auto_reload_failure_count IS 'Count of consecutive auto-reload failures';

-- =====================================================
-- FUNCTION: Check and trigger auto-reload
-- =====================================================
-- This function is called after credit deductions to check
-- if auto-reload should be triggered

CREATE OR REPLACE FUNCTION check_auto_reload()
RETURNS TRIGGER AS $$
DECLARE
  v_account RECORD;
BEGIN
  -- Only check on credit deductions that might trigger low balance
  IF NEW.total_remaining < OLD.total_remaining THEN
    SELECT * INTO v_account FROM credit_accounts WHERE id = NEW.id;
    
    -- Check if auto-reload is enabled and threshold is reached
    IF v_account.auto_reload_enabled = TRUE 
       AND NEW.total_remaining <= v_account.auto_reload_threshold
       AND v_account.stripe_customer_id IS NOT NULL
       AND v_account.auto_reload_failure_count < 3  -- Stop after 3 failures
    THEN
      -- Insert a record into a queue table for the Edge Function to process
      INSERT INTO auto_reload_queue (
        credit_account_id,
        stripe_customer_id,
        amount,
        current_balance,
        threshold,
        created_at
      ) VALUES (
        NEW.id,
        v_account.stripe_customer_id,
        v_account.auto_reload_amount,
        NEW.total_remaining,
        v_account.auto_reload_threshold,
        NOW()
      )
      ON CONFLICT (credit_account_id) 
      WHERE status = 'pending'
      DO NOTHING;  -- Don't create duplicate pending reloads
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- QUEUE TABLE: Auto-reload requests
-- =====================================================
-- Edge function processes this queue to charge Stripe

CREATE TABLE IF NOT EXISTS auto_reload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES credit_accounts(id),
  stripe_customer_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  current_balance NUMERIC(12,2) NOT NULL,
  threshold NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_payment_intent_id TEXT,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_auto_reload_queue_pending 
  ON auto_reload_queue(status, created_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_reload_queue_pending_account
  ON auto_reload_queue(credit_account_id)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE auto_reload_queue ENABLE ROW LEVEL SECURITY;

-- Only admins and system can access queue
CREATE POLICY "Admins can view auto_reload_queue"
  ON auto_reload_queue FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for auto-reload check
DROP TRIGGER IF EXISTS trigger_check_auto_reload ON credit_accounts;
CREATE TRIGGER trigger_check_auto_reload
  AFTER UPDATE OF total_remaining ON credit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION check_auto_reload();

-- =====================================================
-- MINIMUM CREDIT CONSTANTS
-- =====================================================
-- Store minimum credit requirement for campaign activation

CREATE TABLE IF NOT EXISTS credit_system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert minimum campaign activation credit requirement
INSERT INTO credit_system_config (key, value, description)
VALUES (
  'minimum_campaign_activation_credit',
  '100'::jsonb,
  'Minimum credit balance required to activate a campaign ($100)'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- =====================================================
-- UPDATE TYPES
-- =====================================================
-- Grant permissions

GRANT SELECT ON credit_system_config TO authenticated;

