-- Enhanced Campaign System - PART 4: Functions
-- Split from original migration for CLI compatibility
-- Functions are in separate file to avoid CLI parsing issues

CREATE OR REPLACE FUNCTION claim_card_atomic(
  p_pool_id UUID,
  p_recipient_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (
  card_id UUID,
  card_code TEXT,
  card_number TEXT,
  card_value NUMERIC,
  expiration_date TIMESTAMPTZ,
  provider TEXT,
  brand_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $claim_func$
DECLARE
  v_card RECORD;
  v_pool RECORD;
BEGIN
  SELECT * INTO v_pool
  FROM gift_card_pools
  WHERE id = p_pool_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POOL_NOT_FOUND: Gift card pool % not found', p_pool_id;
  END IF;

  IF v_pool.available_cards <= 0 THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: Pool % has no available cards', v_pool.pool_name;
  END IF;

  SELECT 
    gc.id,
    gc.card_code,
    gc.card_number,
    gc.expiration_date,
    v_pool.card_value,
    v_pool.provider,
    v_pool.brand_id
  INTO v_card
  FROM gift_cards gc
  WHERE gc.pool_id = p_pool_id
    AND gc.status = 'available'
  ORDER BY gc.created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: No cards available in pool %', v_pool.pool_name;
  END IF;

  UPDATE gift_cards
  SET 
    status = 'claimed',
    claimed_at = NOW(),
    claimed_by_recipient_id = p_recipient_id,
    updated_at = NOW()
  WHERE id = v_card.id;

  UPDATE gift_card_pools
  SET 
    available_cards = available_cards - 1,
    claimed_cards = claimed_cards + 1,
    updated_at = NOW()
  WHERE id = p_pool_id;

  RETURN QUERY
  SELECT 
    v_card.id,
    v_card.card_code,
    v_card.card_number,
    v_card.card_value,
    v_card.expiration_date,
    v_card.provider,
    v_card.brand_id;
END;
$claim_func$;

