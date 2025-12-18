-- Migration: Add Gift Card Revoke Feature
-- Adds revoked status, revoke tracking columns, and audit log table

-- ============================================================
-- 1. Update recipient_gift_cards delivery_status constraint
-- ============================================================

-- First, drop the existing constraint if it exists
ALTER TABLE recipient_gift_cards 
  DROP CONSTRAINT IF EXISTS recipient_gift_cards_delivery_status_check;

-- Add updated constraint including 'revoked' status
ALTER TABLE recipient_gift_cards 
  ADD CONSTRAINT recipient_gift_cards_delivery_status_check 
  CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'revoked'));

-- ============================================================
-- 2. Add revocation tracking columns to recipient_gift_cards
-- ============================================================

ALTER TABLE recipient_gift_cards 
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE recipient_gift_cards 
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users(id);

ALTER TABLE recipient_gift_cards 
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT;

-- Index for finding revoked cards
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_revoked 
  ON recipient_gift_cards(revoked_at) 
  WHERE revoked_at IS NOT NULL;

-- ============================================================
-- 3. Create gift_card_revoke_log audit table
-- ============================================================

CREATE TABLE IF NOT EXISTS gift_card_revoke_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References to related records
  recipient_gift_card_id UUID,
  inventory_card_id UUID,
  billing_ledger_id UUID,
  recipient_id UUID REFERENCES recipients(id),
  campaign_id UUID REFERENCES campaigns(id),
  condition_id UUID,
  
  -- Who performed the revoke
  revoked_by UUID REFERENCES auth.users(id) NOT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reason TEXT NOT NULL,
  
  -- Snapshot data for historical record (in case records are deleted later)
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  card_value NUMERIC,
  brand_name TEXT,
  original_delivery_status TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_revoke_log_revoked_by 
  ON gift_card_revoke_log(revoked_by);

CREATE INDEX IF NOT EXISTS idx_revoke_log_revoked_at 
  ON gift_card_revoke_log(revoked_at DESC);

CREATE INDEX IF NOT EXISTS idx_revoke_log_campaign 
  ON gift_card_revoke_log(campaign_id);

CREATE INDEX IF NOT EXISTS idx_revoke_log_recipient 
  ON gift_card_revoke_log(recipient_id);

-- ============================================================
-- 4. Enable RLS on gift_card_revoke_log
-- ============================================================

ALTER TABLE gift_card_revoke_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all revoke logs
CREATE POLICY "Admins can view revoke log" 
  ON gift_card_revoke_log
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Service role can insert (used by edge functions)
CREATE POLICY "Service role can insert revoke log" 
  ON gift_card_revoke_log
  FOR INSERT 
  WITH CHECK (true);

-- ============================================================
-- 5. Grant permissions
-- ============================================================

GRANT SELECT ON gift_card_revoke_log TO authenticated;
GRANT INSERT ON gift_card_revoke_log TO service_role;

-- ============================================================
-- 6. Add comment for documentation
-- ============================================================

COMMENT ON TABLE gift_card_revoke_log IS 
  'Audit log for gift card revocations. Records who revoked what and why.';

COMMENT ON COLUMN gift_card_revoke_log.recipient_name IS 
  'Snapshot of recipient name at time of revoke for historical accuracy';

COMMENT ON COLUMN gift_card_revoke_log.original_delivery_status IS 
  'The delivery_status before revocation (sent, delivered, etc.)';
