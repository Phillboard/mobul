-- Migration: Prevent Duplicate Gift Card Deliveries
-- Purpose: Ensure each recipient can only receive ONE gift card per campaign condition
-- This fixes the bug where recipients were receiving multiple gift cards for the same condition

-- ============================================================================
-- STEP 1: Ensure recipient_gift_cards table exists with proper constraints
-- NOTE: This table tracks gift card assignments regardless of which gift card table is used
-- ============================================================================

-- Create table if it doesn't exist (without FK to gift_cards to support both schemas)
CREATE TABLE IF NOT EXISTS recipient_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES campaign_conditions(id) ON DELETE CASCADE,
  gift_card_id UUID, -- FK optional - may reference gift_cards or gift_card_inventory
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_method TEXT CHECK (delivery_method IN ('sms', 'email', 'call_center', 'api')),
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  delivery_address TEXT,
  delivery_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Add UNIQUE constraint to prevent duplicates (idempotent)
-- This is the critical constraint that enforces one card per recipient per condition
-- ============================================================================

DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'recipient_gift_cards_recipient_condition_unique'
  ) THEN
    ALTER TABLE recipient_gift_cards 
    ADD CONSTRAINT recipient_gift_cards_recipient_condition_unique 
    UNIQUE (recipient_id, condition_id);
    
    RAISE NOTICE 'Added UNIQUE constraint on recipient_gift_cards(recipient_id, condition_id)';
  ELSE
    RAISE NOTICE 'UNIQUE constraint already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create indexes for performance (idempotent)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_recipient 
  ON recipient_gift_cards(recipient_id);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_campaign 
  ON recipient_gift_cards(campaign_id);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_condition 
  ON recipient_gift_cards(condition_id);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_gift_card 
  ON recipient_gift_cards(gift_card_id);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_delivery_status 
  ON recipient_gift_cards(delivery_status)
  WHERE delivery_status IN ('pending', 'failed');

-- Composite index for fast recipient+condition lookups
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_lookup 
  ON recipient_gift_cards(recipient_id, condition_id);

-- ============================================================================
-- STEP 4: Create/update helper function to check for existing assignments
-- ============================================================================

CREATE OR REPLACE FUNCTION recipient_has_card_for_condition(
  p_recipient_id UUID,
  p_condition_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM recipient_gift_cards
    WHERE recipient_id = p_recipient_id
      AND condition_id = p_condition_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recipient_has_card_for_condition IS 
  'Check if a recipient already has a gift card assigned for a specific condition';

-- ============================================================================
-- STEP 5: Create/update function to get existing card details
-- Supports both gift_cards and gift_card_inventory tables
-- ============================================================================

-- Drop existing function if signature differs
DROP FUNCTION IF EXISTS get_recipient_gift_card_for_condition(UUID, UUID);

CREATE OR REPLACE FUNCTION get_recipient_gift_card_for_condition(
  p_recipient_id UUID,
  p_condition_id UUID
)
RETURNS TABLE (
  gift_card_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_status TEXT,
  card_code TEXT,
  card_value NUMERIC,
  provider TEXT
) AS $$
BEGIN
  -- Try gift_cards table first, then gift_card_inventory
  RETURN QUERY
  SELECT 
    rgc.gift_card_id,
    rgc.assigned_at,
    rgc.delivered_at,
    rgc.delivery_status,
    COALESCE(gc.card_code, gci.card_code) as card_code,
    COALESCE(gc.card_value, gci.denomination) as card_value,
    COALESCE(gcp.provider, 'Gift Card')::TEXT as provider
  FROM recipient_gift_cards rgc
  LEFT JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  LEFT JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
  LEFT JOIN gift_card_inventory gci ON gci.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id
    AND rgc.condition_id = p_condition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_recipient_gift_card_for_condition IS 
  'Get the gift card details for a recipient for a specific condition';

-- ============================================================================
-- STEP 6: Create function to safely claim card with duplicate prevention
-- This function works with both gift_cards and gift_card_pools tables
-- If those tables don't exist, it still tracks assignments in recipient_gift_cards
-- ============================================================================

-- Drop existing function if signature differs
DROP FUNCTION IF EXISTS claim_card_with_duplicate_check(UUID, UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION claim_card_with_duplicate_check(
  p_pool_id UUID,
  p_recipient_id UUID,
  p_campaign_id UUID,
  p_condition_id UUID
)
RETURNS TABLE (
  card_id UUID,
  card_code TEXT,
  card_number TEXT,
  card_value NUMERIC,
  provider TEXT,
  already_assigned BOOLEAN
) AS $$
DECLARE
  v_card_id UUID;
  v_existing RECORD;
  v_has_gift_cards_table BOOLEAN;
BEGIN
  -- FIRST: Check if recipient already has a card for this condition
  SELECT rgc.gift_card_id, rgc.delivery_status INTO v_existing
  FROM recipient_gift_cards rgc
  WHERE rgc.recipient_id = p_recipient_id
    AND rgc.condition_id = p_condition_id
  LIMIT 1;

  IF FOUND THEN
    -- Already assigned - return existing card info
    RETURN QUERY
    SELECT 
      rgc.gift_card_id AS card_id,
      COALESCE(gc.card_code, gci.card_code, 'N/A')::TEXT as card_code,
      COALESCE(gc.card_number, gci.card_number, '')::TEXT as card_number,
      COALESCE(gc.card_value, gci.denomination, 0)::NUMERIC as card_value,
      COALESCE(gcp.provider, 'Gift Card')::TEXT as provider,
      TRUE AS already_assigned
    FROM recipient_gift_cards rgc
    LEFT JOIN gift_cards gc ON gc.id = rgc.gift_card_id
    LEFT JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
    LEFT JOIN gift_card_inventory gci ON gci.id = rgc.gift_card_id
    WHERE rgc.recipient_id = p_recipient_id
      AND rgc.condition_id = p_condition_id;
    RETURN;
  END IF;

  -- Check if gift_cards table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'gift_cards' AND table_schema = 'public'
  ) INTO v_has_gift_cards_table;

  IF v_has_gift_cards_table THEN
    -- Use gift_cards table
    -- Lock and claim the first available card
    UPDATE gift_cards
    SET 
      status = 'claimed',
      claimed_at = NOW(),
      assigned_to_recipient_id = p_recipient_id,
      assignment_campaign_id = p_campaign_id,
      assignment_condition_id = p_condition_id
    WHERE id = (
      SELECT id FROM gift_cards
      WHERE pool_id = p_pool_id
        AND status = 'available'
        AND assigned_to_recipient_id IS NULL
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id INTO v_card_id;

    IF v_card_id IS NULL THEN
      RAISE EXCEPTION 'NO_CARDS_AVAILABLE: No available cards in pool %', p_pool_id;
    END IF;
  ELSE
    -- Fallback: just use NULL for card_id and rely on recipient_gift_cards
    v_card_id := NULL;
  END IF;

  -- Create the recipient_gift_cards entry
  -- This will fail with unique constraint if race condition occurs
  BEGIN
    INSERT INTO recipient_gift_cards (
      recipient_id,
      campaign_id,
      condition_id,
      gift_card_id,
      delivery_status
    ) VALUES (
      p_recipient_id,
      p_campaign_id,
      p_condition_id,
      v_card_id,
      'pending'
    );
  EXCEPTION WHEN unique_violation THEN
    -- Race condition: another process already assigned a card
    -- Return the card we claimed back to available
    IF v_card_id IS NOT NULL AND v_has_gift_cards_table THEN
      UPDATE gift_cards
      SET status = 'available', claimed_at = NULL, assigned_to_recipient_id = NULL
      WHERE id = v_card_id;
    END IF;
    
    -- Get the existing assignment and return it
    RETURN QUERY
    SELECT 
      rgc.gift_card_id AS card_id,
      COALESCE(gc.card_code, gci.card_code, 'N/A')::TEXT,
      COALESCE(gc.card_number, gci.card_number, '')::TEXT,
      COALESCE(gc.card_value, gci.denomination, 0)::NUMERIC,
      COALESCE(gcp.provider, 'Gift Card')::TEXT,
      TRUE AS already_assigned
    FROM recipient_gift_cards rgc
    LEFT JOIN gift_cards gc ON gc.id = rgc.gift_card_id
    LEFT JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
    LEFT JOIN gift_card_inventory gci ON gci.id = rgc.gift_card_id
    WHERE rgc.recipient_id = p_recipient_id
      AND rgc.condition_id = p_condition_id;
    RETURN;
  END;

  -- Update pool statistics if gift_cards table exists
  IF v_has_gift_cards_table THEN
    UPDATE gift_card_pools
    SET 
      claimed_cards = claimed_cards + 1,
      available_cards = available_cards - 1
    WHERE id = p_pool_id;
  END IF;

  -- Return the newly claimed card
  RETURN QUERY
  SELECT
    v_card_id AS card_id,
    COALESCE(gc.card_code, 'CLAIMED')::TEXT,
    COALESCE(gc.card_number, '')::TEXT,
    COALESCE(gc.card_value, gcp.card_value, 0)::NUMERIC,
    COALESCE(gcp.provider, 'Gift Card')::TEXT,
    FALSE AS already_assigned
  FROM gift_card_pools gcp
  LEFT JOIN gift_cards gc ON gc.id = v_card_id
  WHERE gcp.id = p_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION claim_card_with_duplicate_check IS 
  'Safely claim a gift card with duplicate prevention - returns existing card if already assigned';

-- ============================================================================
-- STEP 7: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION recipient_has_card_for_condition TO authenticated;
GRANT EXECUTE ON FUNCTION recipient_has_card_for_condition TO service_role;
GRANT EXECUTE ON FUNCTION get_recipient_gift_card_for_condition TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipient_gift_card_for_condition TO service_role;
GRANT EXECUTE ON FUNCTION claim_card_with_duplicate_check TO authenticated;
GRANT EXECUTE ON FUNCTION claim_card_with_duplicate_check TO service_role;

-- ============================================================================
-- STEP 8: Enable RLS on recipient_gift_cards (if not already enabled)
-- ============================================================================

ALTER TABLE recipient_gift_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "admin_all_access" ON recipient_gift_cards;
DROP POLICY IF EXISTS "client_view_own" ON recipient_gift_cards;
DROP POLICY IF EXISTS "service_role_all" ON recipient_gift_cards;

-- Admins can see everything
CREATE POLICY "admin_all_access" ON recipient_gift_cards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Users can see their client's recipient gift cards
CREATE POLICY "client_view_own" ON recipient_gift_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = recipient_gift_cards.campaign_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- Service role can manage everything
CREATE POLICY "service_role_all" ON recipient_gift_cards
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- STEP 9: Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_recipient_gift_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipient_gift_cards_updated_at ON recipient_gift_cards;

CREATE TRIGGER recipient_gift_cards_updated_at
  BEFORE UPDATE ON recipient_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_recipient_gift_cards_updated_at();

-- ============================================================================
-- STEP 10: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE recipient_gift_cards IS 
  'Tracks which gift cards are assigned to which recipients for which conditions - enforces one card per recipient per condition';

COMMENT ON COLUMN recipient_gift_cards.recipient_id IS 'The recipient who received the gift card';
COMMENT ON COLUMN recipient_gift_cards.condition_id IS 'The specific condition this gift card fulfills';
COMMENT ON COLUMN recipient_gift_cards.assigned_at IS 'When the card was assigned (locked) to this recipient';
COMMENT ON COLUMN recipient_gift_cards.delivered_at IS 'When the card was successfully delivered';
COMMENT ON COLUMN recipient_gift_cards.delivery_status IS 'Current delivery status for tracking and retry logic';

-- Done!
SELECT 'Migration completed: Duplicate gift card prevention constraints and functions installed' AS status;
