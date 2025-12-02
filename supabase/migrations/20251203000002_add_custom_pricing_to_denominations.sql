-- =====================================================
-- ADD CUSTOM PRICING TO GIFT CARD DENOMINATIONS
-- =====================================================
-- Migration: Add custom pricing columns to support variable pricing
-- Admin can charge clients any amount (above/below face value)
-- =====================================================

-- Add pricing columns to gift_card_denominations
ALTER TABLE gift_card_denominations
  ADD COLUMN IF NOT EXISTS use_custom_pricing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS agency_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cost_basis NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS profit_margin_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN client_price IS NOT NULL AND client_price > 0 AND cost_basis IS NOT NULL AND cost_basis > 0
      THEN ((client_price - cost_basis) / cost_basis * 100)
      ELSE 0
    END
  ) STORED;

-- Create indexes for pricing queries
CREATE INDEX IF NOT EXISTS idx_denominations_custom_pricing 
  ON gift_card_denominations(use_custom_pricing) 
  WHERE use_custom_pricing = true;

CREATE INDEX IF NOT EXISTS idx_denominations_pricing 
  ON gift_card_denominations(brand_id, denomination, client_price);

-- Add comments
COMMENT ON COLUMN gift_card_denominations.use_custom_pricing IS 'When true, use client_price instead of face value denomination';
COMMENT ON COLUMN gift_card_denominations.client_price IS 'Custom price charged to clients (can be different from face value)';
COMMENT ON COLUMN gift_card_denominations.agency_price IS 'Custom price charged to agencies when agency billing is enabled';
COMMENT ON COLUMN gift_card_denominations.cost_basis IS 'What admin pays for these cards (used for profit calculation)';
COMMENT ON COLUMN gift_card_denominations.profit_margin_percentage IS 'Calculated profit margin: (client_price - cost_basis) / cost_basis * 100';

-- Function to get effective price for a denomination
CREATE OR REPLACE FUNCTION get_denomination_price(
  p_brand_id UUID,
  p_denomination NUMERIC,
  p_for_agency BOOLEAN DEFAULT false
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_denom RECORD;
  v_price NUMERIC;
BEGIN
  SELECT * INTO v_denom
  FROM gift_card_denominations
  WHERE brand_id = p_brand_id
    AND denomination = p_denomination
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Return face value if no denomination config exists
    RETURN p_denomination;
  END IF;
  
  -- Use custom pricing if enabled
  IF v_denom.use_custom_pricing THEN
    IF p_for_agency AND v_denom.agency_price IS NOT NULL THEN
      RETURN v_denom.agency_price;
    ELSIF v_denom.client_price IS NOT NULL THEN
      RETURN v_denom.client_price;
    END IF;
  END IF;
  
  -- Default to face value
  RETURN p_denomination;
END;
$$;

COMMENT ON FUNCTION get_denomination_price IS 'Returns the effective price for a denomination, considering custom pricing';

-- Update gift_card_billing_ledger to use custom pricing
-- Add helper function to calculate what should be billed
CREATE OR REPLACE FUNCTION calculate_billing_amount(
  p_brand_id UUID,
  p_denomination NUMERIC,
  p_billed_entity_type TEXT,
  p_billed_entity_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_is_agency BOOLEAN;
  v_price NUMERIC;
BEGIN
  -- Check if billing an agency
  v_is_agency := (p_billed_entity_type = 'agency');
  
  -- Get the appropriate price
  v_price := get_denomination_price(p_brand_id, p_denomination, v_is_agency);
  
  RETURN v_price;
END;
$$;

COMMENT ON FUNCTION calculate_billing_amount IS 'Calculates the amount to bill based on custom pricing configuration';

