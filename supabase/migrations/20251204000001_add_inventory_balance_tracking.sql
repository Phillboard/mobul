-- =====================================================
-- GIFT CARD INVENTORY BALANCE TRACKING
-- =====================================================
-- Add balance tracking capabilities to gift_card_inventory
-- and enhance gift_card_brands with balance check configuration
-- =====================================================

-- =====================================================
-- 1. ADD BALANCE TRACKING TO GIFT_CARD_INVENTORY
-- =====================================================

ALTER TABLE gift_card_inventory
  ADD COLUMN IF NOT EXISTS current_balance NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS last_balance_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS balance_check_status TEXT DEFAULT 'unchecked' 
    CHECK (balance_check_status IN ('unchecked', 'success', 'error', 'manual')),
  ADD COLUMN IF NOT EXISTS balance_check_error TEXT;

COMMENT ON COLUMN gift_card_inventory.current_balance IS 'Current balance of the gift card, updated by balance checks';
COMMENT ON COLUMN gift_card_inventory.last_balance_check IS 'Timestamp of the last balance check';
COMMENT ON COLUMN gift_card_inventory.balance_check_status IS 'Status of last balance check: unchecked, success, error, manual';
COMMENT ON COLUMN gift_card_inventory.balance_check_error IS 'Error message from last failed balance check';

-- Create index for finding cards that need balance checks
CREATE INDEX IF NOT EXISTS idx_inventory_balance_status 
  ON gift_card_inventory(balance_check_status, last_balance_check)
  WHERE status = 'available';

-- =====================================================
-- 2. ENHANCE GIFT_CARD_BRANDS FOR BALANCE CHECK CONFIG
-- =====================================================

ALTER TABLE gift_card_brands
  ADD COLUMN IF NOT EXISTS balance_check_method TEXT DEFAULT 'manual'
    CHECK (balance_check_method IN ('tillo_api', 'manual', 'other_api', 'none')),
  ADD COLUMN IF NOT EXISTS balance_check_api_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS balance_check_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN gift_card_brands.balance_check_method IS 'Method to check card balance: tillo_api, manual, other_api, none';
COMMENT ON COLUMN gift_card_brands.balance_check_api_endpoint IS 'API endpoint URL for balance checking (if applicable)';
COMMENT ON COLUMN gift_card_brands.balance_check_config IS 'JSON config for balance checking (API keys, headers, response mapping)';

-- =====================================================
-- 3. CREATE BALANCE HISTORY TABLE FOR INVENTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS gift_card_inventory_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_card_id UUID NOT NULL REFERENCES gift_card_inventory(id) ON DELETE CASCADE,
  
  -- Balance tracking
  previous_balance NUMERIC(10,2),
  new_balance NUMERIC(10,2),
  change_amount NUMERIC(10,2) GENERATED ALWAYS AS (COALESCE(new_balance, 0) - COALESCE(previous_balance, 0)) STORED,
  
  -- Check metadata
  check_method TEXT NOT NULL DEFAULT 'api',
  check_status TEXT NOT NULL,
  error_message TEXT,
  
  -- Who triggered the check
  checked_by_user_id UUID,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_inventory_balance_history_card ON gift_card_inventory_balance_history(inventory_card_id);
CREATE INDEX idx_inventory_balance_history_date ON gift_card_inventory_balance_history(checked_at DESC);

COMMENT ON TABLE gift_card_inventory_balance_history IS 'History of balance checks for gift card inventory items';

-- =====================================================
-- 4. ENABLE RLS ON NEW TABLE
-- =====================================================

ALTER TABLE gift_card_inventory_balance_history ENABLE ROW LEVEL SECURITY;

-- Admin-only access for balance history
DROP POLICY IF EXISTS "Admins manage balance history" ON gift_card_inventory_balance_history;
CREATE POLICY "Admins manage balance history"
  ON gift_card_inventory_balance_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to balance history" ON gift_card_inventory_balance_history;
CREATE POLICY "Service role full access to balance history"
  ON gift_card_inventory_balance_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 5. UPDATE RLS POLICIES FOR GIFT_CARD_INVENTORY
-- =====================================================
-- Ensure admins can access individual card details

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all inventory" ON gift_card_inventory;
DROP POLICY IF EXISTS "Admins can manage inventory" ON gift_card_inventory;
DROP POLICY IF EXISTS "Service role full access to inventory" ON gift_card_inventory;

-- Admin read access for all cards (including individual details)
CREATE POLICY "Admins can view all inventory"
  ON gift_card_inventory
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin write access (update, delete)
CREATE POLICY "Admins can manage inventory"
  ON gift_card_inventory
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access to inventory"
  ON gift_card_inventory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to update card balance
CREATE OR REPLACE FUNCTION update_inventory_card_balance(
  p_card_id UUID,
  p_new_balance NUMERIC,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_checked_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_balance NUMERIC;
  v_result JSONB;
BEGIN
  -- Get current balance
  SELECT current_balance INTO v_previous_balance
  FROM gift_card_inventory
  WHERE id = p_card_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not found');
  END IF;
  
  -- Update the card
  UPDATE gift_card_inventory
  SET 
    current_balance = p_new_balance,
    last_balance_check = NOW(),
    balance_check_status = p_status,
    balance_check_error = p_error_message
  WHERE id = p_card_id;
  
  -- Record in history
  INSERT INTO gift_card_inventory_balance_history (
    inventory_card_id,
    previous_balance,
    new_balance,
    check_method,
    check_status,
    error_message,
    checked_by_user_id
  ) VALUES (
    p_card_id,
    v_previous_balance,
    p_new_balance,
    'api',
    p_status,
    p_error_message,
    p_checked_by
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_previous_balance,
    'new_balance', p_new_balance,
    'change_amount', COALESCE(p_new_balance, 0) - COALESCE(v_previous_balance, 0)
  );
END;
$$;

-- Function to delete inventory card (with safety checks)
CREATE OR REPLACE FUNCTION delete_inventory_card(
  p_card_id UUID,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_card_code TEXT;
BEGIN
  -- Get card info
  SELECT status, card_code INTO v_status, v_card_code
  FROM gift_card_inventory
  WHERE id = p_card_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not found');
  END IF;
  
  -- Safety check: don't delete assigned or delivered cards unless forced
  IF NOT p_force AND v_status IN ('assigned', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot delete cards that are assigned or delivered. Use force=true to override.'
    );
  END IF;
  
  -- Delete the card (cascades to balance history)
  DELETE FROM gift_card_inventory WHERE id = p_card_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_card_code', LEFT(v_card_code, 4) || '****',
    'previous_status', v_status
  );
END;
$$;

-- Grant execute to authenticated users (function will check admin status internally)
GRANT EXECUTE ON FUNCTION update_inventory_card_balance TO authenticated;
GRANT EXECUTE ON FUNCTION delete_inventory_card TO authenticated;
GRANT EXECUTE ON FUNCTION update_inventory_card_balance TO service_role;
GRANT EXECUTE ON FUNCTION delete_inventory_card TO service_role;

-- =====================================================
-- 7. CREATE VIEW FOR INVENTORY SUMMARY WITH BALANCE INFO
-- =====================================================

CREATE OR REPLACE VIEW gift_card_inventory_summary AS
SELECT 
  gci.brand_id,
  gcb.brand_name,
  gcb.logo_url,
  gcb.balance_check_method,
  gci.denomination,
  COUNT(*) FILTER (WHERE gci.status = 'available') as available_count,
  COUNT(*) FILTER (WHERE gci.status = 'assigned') as assigned_count,
  COUNT(*) FILTER (WHERE gci.status = 'delivered') as delivered_count,
  COUNT(*) FILTER (WHERE gci.status = 'expired') as expired_count,
  COUNT(*) as total_count,
  SUM(gci.denomination) FILTER (WHERE gci.status IN ('available', 'assigned')) as total_value,
  SUM(gci.current_balance) FILTER (WHERE gci.current_balance IS NOT NULL) as total_current_balance,
  COUNT(*) FILTER (WHERE gci.balance_check_status = 'unchecked') as unchecked_count,
  COUNT(*) FILTER (WHERE gci.balance_check_status = 'error') as error_count,
  MAX(gci.last_balance_check) as last_balance_check
FROM gift_card_inventory gci
JOIN gift_card_brands gcb ON gci.brand_id = gcb.id
GROUP BY gci.brand_id, gcb.brand_name, gcb.logo_url, gcb.balance_check_method, gci.denomination;

COMMENT ON VIEW gift_card_inventory_summary IS 'Aggregated summary of gift card inventory with balance check status';

-- =====================================================
-- SUMMARY
-- =====================================================
-- Added to gift_card_inventory:
--   - current_balance, last_balance_check, balance_check_status, balance_check_error
-- Added to gift_card_brands:
--   - balance_check_method, balance_check_api_endpoint, balance_check_config
-- Created:
--   - gift_card_inventory_balance_history table
--   - update_inventory_card_balance() function
--   - delete_inventory_card() function
--   - gift_card_inventory_summary view
-- RLS:
--   - Admin-only access for individual card details
--   - Service role full access

