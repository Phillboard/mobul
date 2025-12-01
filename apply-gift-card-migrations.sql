-- ============================================================================
-- COMBINED GIFT CARD MIGRATIONS
-- ============================================================================
-- This file contains all 6 migrations needed to fix the gift card system
-- Copy and paste this entire file into Supabase SQL Editor and click "Run"
-- ============================================================================

-- Migration 1: 20251201000004_add_gift_card_assignment_tracking.sql
-- Add gift card assignment tracking fields
-- This enables atomic assignment to prevent double redemptions

ALTER TABLE gift_cards
  ADD COLUMN IF NOT EXISTS assigned_to_recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS assignment_source TEXT CHECK (assignment_source IN ('call_center', 'landing_page', 'form_submission', 'api', 'manual')),
  ADD COLUMN IF NOT EXISTS assignment_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_condition_id UUID REFERENCES campaign_conditions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gift_cards_assignment_lookup 
  ON gift_cards(assigned_to_recipient_id, assignment_condition_id)
  WHERE assigned_to_recipient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gift_cards_brand_value_available 
  ON gift_cards(brand_id, card_value, status, pool_id)
  WHERE status = 'available';

COMMENT ON COLUMN gift_cards.assigned_to_recipient_id IS 'Recipient this card is locked to - prevents double redemption';
COMMENT ON COLUMN gift_cards.assignment_locked_at IS 'When the card was assigned (locked) to prevent other claims';
COMMENT ON COLUMN gift_cards.assignment_source IS 'Where the assignment originated: call_center, landing_page, form_submission, api, or manual';
COMMENT ON COLUMN gift_cards.assignment_campaign_id IS 'Campaign this assignment is for';
COMMENT ON COLUMN gift_cards.assignment_condition_id IS 'Specific condition this card fulfills';

DROP POLICY IF EXISTS "prevent_double_assignment" ON gift_cards;

CREATE POLICY "prevent_double_assignment" ON gift_cards
  FOR UPDATE
  USING (
    status = 'available' 
    OR (assigned_to_recipient_id = auth.uid() AND assignment_locked_at IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION is_card_available_for_assignment(card_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gift_cards
    WHERE id = card_id
      AND status = 'available'
      AND assigned_to_recipient_id IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_card_available_for_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION is_card_available_for_assignment TO service_role;

-- ============================================================================
-- Migration 2: 20251201000005_create_recipient_gift_cards_junction.sql
-- Create junction table for tracking multiple gift card assignments per recipient

CREATE TABLE IF NOT EXISTS recipient_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES campaign_conditions(id) ON DELETE CASCADE,
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_method TEXT CHECK (delivery_method IN ('sms', 'email', 'call_center', 'api')),
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  delivery_address TEXT,
  delivery_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipient_id, condition_id)
);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_recipient ON recipient_gift_cards(recipient_id);
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_campaign ON recipient_gift_cards(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_condition ON recipient_gift_cards(condition_id);
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_gift_card ON recipient_gift_cards(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_delivery_status ON recipient_gift_cards(delivery_status) WHERE delivery_status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_lookup ON recipient_gift_cards(recipient_id, condition_id);

COMMENT ON TABLE recipient_gift_cards IS 'Tracks which gift cards are assigned to which recipients for which conditions - enables multi-condition rewards';

ALTER TABLE recipient_gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_access" ON recipient_gift_cards
  FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "client_view_own" ON recipient_gift_cards
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaigns c
    INNER JOIN user_clients uc ON uc.client_id = c.client_id
    WHERE uc.user_id = auth.uid() AND c.id = recipient_gift_cards.campaign_id
  ));

CREATE POLICY "service_role_all" ON recipient_gift_cards
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE OR REPLACE FUNCTION get_recipient_gift_card_for_condition(p_recipient_id UUID, p_condition_id UUID)
RETURNS TABLE (gift_card_id UUID, assigned_at TIMESTAMP WITH TIME ZONE, delivered_at TIMESTAMP WITH TIME ZONE, delivery_status TEXT, card_code TEXT, card_value NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT rgc.gift_card_id, rgc.assigned_at, rgc.delivered_at, rgc.delivery_status, gc.card_code, gc.card_value
  FROM recipient_gift_cards rgc
  INNER JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id AND rgc.condition_id = p_condition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION recipient_has_card_for_condition(p_recipient_id UUID, p_condition_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM recipient_gift_cards WHERE recipient_id = p_recipient_id AND condition_id = p_condition_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_recipient_gift_card_for_condition TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipient_gift_card_for_condition TO service_role;
GRANT EXECUTE ON FUNCTION recipient_has_card_for_condition TO authenticated;
GRANT EXECUTE ON FUNCTION recipient_has_card_for_condition TO service_role;

CREATE OR REPLACE FUNCTION update_recipient_gift_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipient_gift_cards_updated_at
  BEFORE UPDATE ON recipient_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_recipient_gift_cards_updated_at();

-- ============================================================================
-- Migration 3: 20251201000006_create_brand_denomination_functions.sql
-- ⭐ THIS IS THE KEY MIGRATION THAT FIXES THE "Failed to load" ERROR ⭐

CREATE OR REPLACE FUNCTION get_available_brand_denominations(p_client_id UUID)
RETURNS TABLE (brand_id UUID, brand_name TEXT, brand_logo TEXT, brand_category TEXT, card_value NUMERIC, total_available INTEGER, pool_ids UUID[]) AS $$
BEGIN
  RETURN QUERY
  SELECT gcb.id AS brand_id, gcb.brand_name, gcb.logo_url AS brand_logo, gcb.category AS brand_category, gcp.card_value, SUM(gcp.available_cards)::INTEGER AS total_available, ARRAY_AGG(gcp.id) AS pool_ids
  FROM gift_card_pools gcp
  INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  WHERE gcp.client_id = p_client_id AND gcp.is_active = true AND gcp.available_cards > 0
  GROUP BY gcb.id, gcb.brand_name, gcb.logo_url, gcb.category, gcp.card_value
  HAVING SUM(gcp.available_cards) > 0
  ORDER BY gcb.brand_name, gcp.card_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_available_brand_denominations IS 'Aggregates gift card pools by brand and denomination, hiding pool structure from clients. Returns only combinations with available cards.';

GRANT EXECUTE ON FUNCTION get_available_brand_denominations TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_brand_denominations TO service_role;

CREATE OR REPLACE FUNCTION get_brand_denomination_info(p_client_id UUID, p_brand_id UUID, p_card_value NUMERIC)
RETURNS TABLE (brand_name TEXT, brand_logo TEXT, total_available INTEGER, pool_ids UUID[]) AS $$
BEGIN
  RETURN QUERY
  SELECT gcb.brand_name, gcb.logo_url AS brand_logo, SUM(gcp.available_cards)::INTEGER AS total_available, ARRAY_AGG(gcp.id) AS pool_ids
  FROM gift_card_pools gcp
  INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  WHERE gcp.client_id = p_client_id AND gcp.brand_id = p_brand_id AND gcp.card_value = p_card_value AND gcp.is_active = true AND gcp.available_cards > 0
  GROUP BY gcb.brand_name, gcb.logo_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_brand_denomination_info IS 'Gets details for a specific brand+value combination including total availability and pool IDs';

GRANT EXECUTE ON FUNCTION get_brand_denomination_info TO authenticated;
GRANT EXECUTE ON FUNCTION get_brand_denomination_info TO service_role;

-- ============================================================================
-- Migration 4: 20251201000007_create_smart_pool_selection.sql

CREATE OR REPLACE FUNCTION select_best_pool_for_card(p_brand_id UUID, p_card_value NUMERIC, p_client_id UUID)
RETURNS UUID AS $$
DECLARE
  v_pool_id UUID;
BEGIN
  SELECT id INTO v_pool_id
  FROM gift_card_pools
  WHERE client_id = p_client_id AND brand_id = p_brand_id AND card_value = p_card_value AND is_active = true AND available_cards > 0
  ORDER BY available_cards DESC, created_at ASC
  LIMIT 1;
  RETURN v_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION select_best_pool_for_card IS 'Selects the optimal pool for a brand+denomination combination. Prioritizes pools with more inventory.';

GRANT EXECUTE ON FUNCTION select_best_pool_for_card TO authenticated;
GRANT EXECUTE ON FUNCTION select_best_pool_for_card TO service_role;

CREATE OR REPLACE FUNCTION has_available_cards(p_brand_id UUID, p_card_value NUMERIC, p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM gift_card_pools WHERE client_id = p_client_id AND brand_id = p_brand_id AND card_value = p_card_value AND is_active = true AND available_cards > 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_available_cards IS 'Quick check if any pools have available cards for a brand+denomination combination';

GRANT EXECUTE ON FUNCTION has_available_cards TO authenticated;
GRANT EXECUTE ON FUNCTION has_available_cards TO service_role;

CREATE OR REPLACE FUNCTION get_total_available_cards(p_brand_id UUID, p_card_value NUMERIC, p_client_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(available_cards), 0)::INTEGER INTO v_total
  FROM gift_card_pools
  WHERE client_id = p_client_id AND brand_id = p_brand_id AND card_value = p_card_value AND is_active = true;
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_total_available_cards IS 'Returns total available cards across all pools for a brand+denomination';

GRANT EXECUTE ON FUNCTION get_total_available_cards TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_available_cards TO service_role;

-- ============================================================================
-- Migration 5: 20251201000008_update_claim_card_atomic_v2.sql

DROP FUNCTION IF EXISTS claim_card_atomic(UUID, UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION claim_card_atomic(
  p_brand_id UUID,
  p_card_value NUMERIC,
  p_client_id UUID,
  p_recipient_id UUID,
  p_campaign_id UUID,
  p_condition_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'call_center'
)
RETURNS TABLE (card_id UUID, card_code TEXT, card_number TEXT, card_value_amount NUMERIC, pool_id UUID, pool_name TEXT, brand_name TEXT, provider TEXT, already_assigned BOOLEAN) AS $$
DECLARE
  v_pool_id UUID;
  v_card_id UUID;
  v_existing_assignment RECORD;
BEGIN
  SELECT * INTO v_existing_assignment
  FROM recipient_gift_cards rgc
  INNER JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id AND rgc.condition_id = p_condition_id;
  
  IF FOUND THEN
    RETURN QUERY
    SELECT gc.id AS card_id, gc.card_code, gc.card_number, gc.card_value AS card_value_amount, gc.pool_id, gcp.pool_name, gcb.brand_name, gcp.provider, TRUE AS already_assigned
    FROM gift_cards gc
    INNER JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
    INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
    WHERE gc.id = v_existing_assignment.gift_card_id;
    RETURN;
  END IF;
  
  v_pool_id := select_best_pool_for_card(p_brand_id, p_card_value, p_client_id);
  
  IF v_pool_id IS NULL THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: No available cards for brand % with value %', p_brand_id, p_card_value;
  END IF;
  
  SELECT id INTO v_card_id
  FROM gift_cards
  WHERE pool_id = v_pool_id AND status = 'available' AND assigned_to_recipient_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_card_id IS NULL THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: Pool exhausted during claim attempt';
  END IF;
  
  UPDATE gift_cards
  SET status = 'claimed', assigned_to_recipient_id = p_recipient_id, assignment_locked_at = NOW(), assignment_source = p_source,
      assignment_campaign_id = p_campaign_id, assignment_condition_id = p_condition_id, claimed_at = NOW(),
      claimed_by_agent_id = p_agent_id, updated_at = NOW()
  WHERE id = v_card_id;
  
  INSERT INTO recipient_gift_cards (recipient_id, campaign_id, condition_id, gift_card_id, assigned_at, delivery_status)
  VALUES (p_recipient_id, p_campaign_id, p_condition_id, v_card_id, NOW(), 'pending');
  
  UPDATE gift_card_pools
  SET available_cards = available_cards - 1, claimed_cards = claimed_cards + 1, updated_at = NOW()
  WHERE id = v_pool_id;
  
  RETURN QUERY
  SELECT gc.id AS card_id, gc.card_code, gc.card_number, gc.card_value AS card_value_amount, gc.pool_id, gcp.pool_name, gcb.brand_name, gcp.provider, FALSE AS already_assigned
  FROM gift_cards gc
  INNER JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
  INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  WHERE gc.id = v_card_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Claim failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION claim_card_atomic IS 'Atomically claims a gift card for a recipient+condition using brand+denomination. Prevents double redemptions with assignment locking. Returns existing card if already assigned.';

GRANT EXECUTE ON FUNCTION claim_card_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION claim_card_atomic TO service_role;

CREATE OR REPLACE FUNCTION update_gift_card_delivery_status(
  p_recipient_id UUID,
  p_condition_id UUID,
  p_delivery_status TEXT,
  p_delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_delivery_method TEXT DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE recipient_gift_cards
  SET delivery_status = p_delivery_status, delivered_at = COALESCE(p_delivered_at, delivered_at),
      delivery_method = COALESCE(p_delivery_method, delivery_method), delivery_address = COALESCE(p_delivery_address, delivery_address),
      delivery_error = p_delivery_error, updated_at = NOW()
  WHERE recipient_id = p_recipient_id AND condition_id = p_condition_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  IF v_updated THEN
    UPDATE gift_cards gc
    SET status = CASE WHEN p_delivery_status = 'delivered' THEN 'delivered' WHEN p_delivery_status = 'failed' THEN 'failed' ELSE gc.status END, updated_at = NOW()
    WHERE gc.id = (SELECT gift_card_id FROM recipient_gift_cards WHERE recipient_id = p_recipient_id AND condition_id = p_condition_id);
  END IF;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_gift_card_delivery_status IS 'Updates delivery status for a recipient+condition gift card assignment';

GRANT EXECUTE ON FUNCTION update_gift_card_delivery_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_gift_card_delivery_status TO service_role;

-- ============================================================================
-- Migration 6: 20251201000009_update_campaign_conditions_schema.sql

ALTER TABLE campaign_conditions
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES gift_card_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS card_value NUMERIC(10,2);

COMMENT ON COLUMN campaign_conditions.brand_id IS 'Gift card brand for this condition reward - used with card_value for simplified selection';
COMMENT ON COLUMN campaign_conditions.card_value IS 'Gift card denomination for this condition reward - used with brand_id';
COMMENT ON COLUMN campaign_conditions.gift_card_pool_id IS 'Legacy field - use brand_id+card_value for new campaigns. Kept for backward compatibility';

CREATE INDEX IF NOT EXISTS idx_campaign_conditions_brand_value 
  ON campaign_conditions(brand_id, card_value)
  WHERE brand_id IS NOT NULL;

CREATE OR REPLACE FUNCTION get_condition_gift_card_config(p_condition_id UUID)
RETURNS TABLE (brand_id UUID, brand_name TEXT, card_value NUMERIC, pool_id UUID, uses_new_format BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT cc.brand_id, gcb.brand_name, cc.card_value, cc.gift_card_pool_id AS pool_id, (cc.brand_id IS NOT NULL) AS uses_new_format
  FROM campaign_conditions cc
  LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
  WHERE cc.id = p_condition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_condition_gift_card_config IS 'Returns gift card configuration for a condition, supporting both new (brand+value) and legacy (pool_id) formats';

GRANT EXECUTE ON FUNCTION get_condition_gift_card_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_condition_gift_card_config TO service_role;

CREATE OR REPLACE FUNCTION migrate_condition_to_brand_value(p_condition_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_pool_id UUID;
  v_brand_id UUID;
  v_card_value NUMERIC;
  v_updated BOOLEAN := FALSE;
BEGIN
  SELECT gift_card_pool_id INTO v_pool_id
  FROM campaign_conditions
  WHERE id = p_condition_id AND brand_id IS NULL AND gift_card_pool_id IS NOT NULL;
  
  IF v_pool_id IS NOT NULL THEN
    SELECT brand_id, card_value INTO v_brand_id, v_card_value
    FROM gift_card_pools
    WHERE id = v_pool_id;
    
    IF v_brand_id IS NOT NULL THEN
      UPDATE campaign_conditions
      SET brand_id = v_brand_id, card_value = v_card_value, updated_at = NOW()
      WHERE id = p_condition_id;
      v_updated := TRUE;
    END IF;
  END IF;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION migrate_condition_to_brand_value IS 'Migrates a legacy condition from pool_id format to brand_id+card_value format';

GRANT EXECUTE ON FUNCTION migrate_condition_to_brand_value TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_condition_to_brand_value TO service_role;

-- ============================================================================
-- MIGRATIONS COMPLETE!
-- ============================================================================
-- All 6 gift card migrations have been applied.
-- Your gift card selector should now work without "Failed to load" errors.
-- ============================================================================

