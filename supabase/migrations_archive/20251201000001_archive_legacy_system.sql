-- =====================================================
-- ARCHIVE OLD POOL-BASED SYSTEM
-- =====================================================
-- Migration: Archive legacy tables for reference
-- Part of fresh start migration strategy
-- =====================================================

-- Disable RLS temporarily to avoid conflicts during rename
ALTER TABLE IF EXISTS gift_card_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_card_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_sales DISABLE ROW LEVEL SECURITY;

-- Rename old tables with _legacy suffix
ALTER TABLE IF EXISTS gift_card_pools RENAME TO gift_card_pools_legacy;
ALTER TABLE IF EXISTS gift_cards RENAME TO gift_cards_legacy;
ALTER TABLE IF EXISTS admin_card_sales RENAME TO admin_card_sales_legacy;
ALTER TABLE IF EXISTS gift_card_sales RENAME TO gift_card_sales_legacy;

-- Add archived_at column to legacy tables
ALTER TABLE IF EXISTS gift_card_pools_legacy ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS gift_cards_legacy ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS admin_card_sales_legacy ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS gift_card_sales_legacy ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

-- Add note explaining the archive
COMMENT ON TABLE gift_card_pools_legacy IS 'ARCHIVED: Old pool-based system. Replaced by credit_accounts system on 2024-12-01. Kept for historical reference only.';
COMMENT ON TABLE gift_cards_legacy IS 'ARCHIVED: Old gift card records. Replaced by new gift_cards table with credit system integration. Kept for historical reference only.';
COMMENT ON TABLE admin_card_sales_legacy IS 'ARCHIVED: Old card sales/transfer system. Replaced by credit_transactions ledger. Kept for historical reference only.';
COMMENT ON TABLE gift_card_sales_legacy IS 'ARCHIVED: Old sales tracking. Replaced by credit_transactions ledger. Kept for historical reference only.';

-- =====================================================
-- CREATE NEW GIFT_CARD_POOLS TABLE
-- =====================================================
-- Fresh table with pool_type support

CREATE TABLE IF NOT EXISTS gift_card_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pool identification
  pool_name TEXT NOT NULL,
  pool_type TEXT DEFAULT 'csv' CHECK (pool_type IN ('csv', 'buffer', 'api_config')),
  
  -- Brand and value
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id),
  card_value NUMERIC(10,2) NOT NULL,
  provider TEXT,
  
  -- Ownership (NULL for platform-owned pools)
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  is_master_pool BOOLEAN DEFAULT false,
  
  -- Card counts
  total_cards INTEGER DEFAULT 0,
  available_cards INTEGER DEFAULT 0,
  claimed_cards INTEGER DEFAULT 0,
  delivered_cards INTEGER DEFAULT 0,
  failed_cards INTEGER DEFAULT 0,
  
  -- Pool configuration
  is_active BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 50,
  buffer_target_quantity INTEGER DEFAULT 100,
  buffer_refill_threshold INTEGER DEFAULT 20,
  cost_per_card NUMERIC(10,2), -- What we pay for these cards
  
  -- API configuration (for pool_type = 'api_config')
  api_provider_id UUID REFERENCES gift_card_api_providers(id),
  api_config JSONB,
  
  -- Balance checking (legacy compatibility)
  auto_balance_check BOOLEAN DEFAULT false,
  balance_check_frequency_hours INTEGER DEFAULT 24,
  last_balance_check TIMESTAMPTZ,
  
  -- Marketplace (legacy compatibility)
  available_for_purchase BOOLEAN DEFAULT false,
  sale_price_per_card NUMERIC,
  markup_percentage NUMERIC,
  min_purchase_quantity INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_brand ON gift_card_pools(brand_id, card_value);
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_client ON gift_card_pools(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_type ON gift_card_pools(pool_type, brand_id, card_value);
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_active ON gift_card_pools(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_master ON gift_card_pools(is_master_pool) WHERE is_master_pool = true;

-- Enable RLS
ALTER TABLE gift_card_pools ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their client's pools"
  ON gift_card_pools FOR SELECT
  USING (
    (client_id IS NOT NULL AND user_can_access_client(auth.uid(), client_id))
    OR 
    (is_master_pool = true AND has_role(auth.uid(), 'admin'::app_role))
    OR
    (available_for_purchase = true)
  );

CREATE POLICY "Admins can manage pools"
  ON gift_card_pools FOR ALL
  USING (
    user_can_access_client(auth.uid(), client_id) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agency_owner') OR has_role(auth.uid(), 'company_owner'))
  );

CREATE POLICY "Admins can manage master pools"
  ON gift_card_pools FOR ALL
  USING (
    (is_master_pool = true AND has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    (is_master_pool = true AND has_role(auth.uid(), 'admin'::app_role))
  );

-- Update trigger
CREATE TRIGGER update_gift_card_pools_updated_at
  BEFORE UPDATE ON gift_card_pools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREATE NEW GIFT_CARDS TABLE
-- =====================================================
-- Fresh table integrated with credit system

CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES gift_card_pools(id) ON DELETE CASCADE,
  
  -- Card details
  card_code TEXT NOT NULL,
  card_number TEXT,
  expiration_date DATE,
  
  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'delivered', 'failed', 'expired')),
  
  -- Claiming
  claimed_at TIMESTAMPTZ,
  claimed_by_recipient_id UUID REFERENCES recipients(id),
  claimed_by_call_session_id UUID,
  
  -- Delivery
  delivered_at TIMESTAMPTZ,
  delivery_method TEXT CHECK (delivery_method IN ('sms', 'email')),
  delivery_address TEXT,
  
  -- Balance tracking
  current_balance NUMERIC,
  last_balance_check TIMESTAMPTZ,
  balance_check_status TEXT DEFAULT 'unchecked',
  brand_id UUID REFERENCES gift_card_brands(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(card_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gift_cards_pool ON gift_cards(pool_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(card_code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient ON gift_cards(claimed_by_recipient_id) WHERE claimed_by_recipient_id IS NOT NULL;

-- Enable RLS
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view cards in their client's pools"
  ON gift_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gift_card_pools gcp
      WHERE gcp.id = gift_cards.pool_id
        AND user_can_access_client(auth.uid(), gcp.client_id)
    )
  );

CREATE POLICY "Admins can manage gift cards"
  ON gift_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gift_card_pools gcp
      WHERE gcp.id = gift_cards.pool_id
        AND user_can_access_client(auth.uid(), gcp.client_id)
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agency_owner') OR has_role(auth.uid(), 'company_owner'))
    )
  );

-- =====================================================
-- RECREATE CLAIM FUNCTION FOR NEW TABLE
-- =====================================================

-- Drop existing function to allow signature change
DROP FUNCTION IF EXISTS public.claim_available_card(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.claim_available_card(UUID, UUID);

CREATE OR REPLACE FUNCTION public.claim_available_card(
  p_pool_id UUID,
  p_recipient_id UUID,
  p_call_session_id UUID DEFAULT NULL
)
RETURNS TABLE (
  card_id UUID,
  card_code TEXT,
  card_number TEXT,
  card_value NUMERIC,
  provider TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Lock and claim the first available card atomically
  UPDATE gift_cards
  SET 
    status = 'claimed',
    claimed_at = NOW(),
    claimed_by_recipient_id = p_recipient_id,
    claimed_by_call_session_id = p_call_session_id
  WHERE id = (
    SELECT id FROM gift_cards
    WHERE pool_id = p_pool_id
      AND status = 'available'
      AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_card_id;
  
  -- If no card was claimed, raise exception
  IF v_card_id IS NULL THEN
    RAISE EXCEPTION 'No available gift cards in pool';
  END IF;
  
  -- Update pool statistics
  UPDATE gift_card_pools
  SET 
    available_cards = available_cards - 1,
    claimed_cards = claimed_cards + 1,
    updated_at = NOW()
  WHERE id = p_pool_id;
  
  -- Return the claimed card details
  RETURN QUERY
  SELECT 
    gc.id,
    gc.card_code,
    gc.card_number,
    gcp.card_value,
    gcp.provider
  FROM gift_cards gc
  JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
  WHERE gc.id = v_card_id;
END;
$$;

COMMENT ON FUNCTION claim_available_card IS 'Atomically claims an available gift card from a pool. Returns card details.';

-- =====================================================
-- CREATE SYSTEM_ALERTS TABLE (for monitoring)
-- =====================================================

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON system_alerts(resolved_at) WHERE resolved_at IS NULL;

-- Enable RLS
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all alerts"
  ON system_alerts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create alerts"
  ON system_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can resolve alerts"
  ON system_alerts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE system_alerts IS 'System-wide alerts for monitoring provisioning failures, low stock, etc.';

