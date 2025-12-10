-- Phase 1: Add columns to gift_card_pools for admin control and API provisioning
ALTER TABLE gift_card_pools 
ADD COLUMN available_for_purchase boolean DEFAULT false,
ADD COLUMN purchase_method text DEFAULT 'csv_only' 
  CHECK (purchase_method IN ('csv_only', 'api_only', 'csv_with_fallback')),
ADD COLUMN api_provider text,
ADD COLUMN api_config jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN gift_card_pools.available_for_purchase IS 
  'Only pools marked true will show on purchase page';
COMMENT ON COLUMN gift_card_pools.purchase_method IS 
  'csv_only: Manual CSV uploads only, api_only: Auto-provision via API, csv_with_fallback: Try CSV first then API';
COMMENT ON COLUMN gift_card_pools.api_provider IS 
  'API provider name (e.g., tango_card, giftbit, rybbon)';
COMMENT ON COLUMN gift_card_pools.api_config IS 
  'Encrypted API credentials and configuration';

-- Create table for API provider templates
CREATE TABLE gift_card_api_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  api_endpoint text NOT NULL,
  auth_type text NOT NULL CHECK (auth_type IN ('api_key', 'oauth', 'basic')),
  config_schema jsonb NOT NULL,
  supported_brands jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS: Only admins can view/manage API providers
ALTER TABLE gift_card_api_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API providers"
  ON gift_card_api_providers
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Track API purchases separately
CREATE TABLE gift_card_api_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid REFERENCES gift_card_pools(id) ON DELETE CASCADE,
  api_provider text NOT NULL,
  quantity integer NOT NULL,
  card_value numeric NOT NULL,
  total_cost_cents integer NOT NULL,
  api_transaction_id text,
  api_response jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- RLS: Users can view API purchases for accessible clients
ALTER TABLE gift_card_api_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view API purchases for their pools"
  ON gift_card_api_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gift_card_pools gcp
      WHERE gcp.id = pool_id 
      AND user_can_access_client(auth.uid(), gcp.client_id)
    )
  );

-- Update RLS policies for gift_card_pools
CREATE POLICY "Admins can update pool availability"
  ON gift_card_pools
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Drop existing function first, then recreate with new return type
DROP FUNCTION IF EXISTS claim_available_card(uuid, uuid, uuid);

-- Create claim_available_card function with API fallback logic
CREATE FUNCTION claim_available_card(
  p_pool_id uuid, 
  p_recipient_id uuid, 
  p_call_session_id uuid DEFAULT NULL
)
RETURNS TABLE(
  card_id uuid, 
  card_code text, 
  card_number text, 
  card_value numeric, 
  provider text,
  provisioned_via_api boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
  v_purchase_method TEXT;
  v_api_provider TEXT;
BEGIN
  -- Try to claim from CSV inventory
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
  
  -- If found in CSV, return it
  IF v_card_id IS NOT NULL THEN
    UPDATE gift_card_pools
    SET 
      available_cards = available_cards - 1,
      claimed_cards = claimed_cards + 1,
      updated_at = NOW()
    WHERE id = p_pool_id;
    
    RETURN QUERY
    SELECT 
      gc.id,
      gc.card_code,
      gc.card_number,
      gcp.card_value,
      gcp.provider,
      false as provisioned_via_api
    FROM gift_cards gc
    JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
    WHERE gc.id = v_card_id;
    RETURN;
  END IF;
  
  -- No CSV cards available, check if API fallback is enabled
  SELECT purchase_method, api_provider
  INTO v_purchase_method, v_api_provider
  FROM gift_card_pools
  WHERE id = p_pool_id;
  
  IF v_purchase_method IN ('api_only', 'csv_with_fallback') AND v_api_provider IS NOT NULL THEN
    -- Signal that API provisioning is needed
    RAISE EXCEPTION 'API_PROVISIONING_REQUIRED:%', v_api_provider;
  ELSE
    RAISE EXCEPTION 'No available gift cards in pool and API fallback not configured';
  END IF;
END;
$$;

-- Seed initial API providers
INSERT INTO gift_card_api_providers (provider_name, display_name, api_endpoint, auth_type, config_schema, supported_brands) VALUES
('tango_card', 'Tango Card', 'https://integration-api.tangocard.com/raas/v2', 'basic', '{"username":"","password":"","platformName":""}', '["Amazon", "Visa", "Target", "Starbucks"]'),
('giftbit', 'Giftbit', 'https://api.giftbit.com/v2', 'api_key', '{"apiKey":""}', '["Amazon", "Visa", "Mastercard"]'),
('rybbon', 'Rybbon', 'https://api.rybbon.net/v1', 'api_key', '{"apiKey":""}', '["Amazon", "Starbucks", "Uber"]');