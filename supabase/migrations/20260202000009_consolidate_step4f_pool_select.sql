-- Step 4f: Updated select_best_pool_for_card - now checks inventory directly
SET search_path TO public;

CREATE OR REPLACE FUNCTION public.select_best_pool_for_card(
  p_brand_id uuid,
  p_card_value numeric,
  p_client_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pool_id UUID;
BEGIN
  -- First check: pools that have inventory cards available
  SELECT gcp.id INTO v_pool_id
  FROM gift_card_pools gcp
  WHERE gcp.client_id = p_client_id
    AND gcp.brand_id = p_brand_id
    AND gcp.card_value = p_card_value
    AND gcp.is_active = true
    AND EXISTS (
      SELECT 1 FROM gift_card_inventory gi
      WHERE gi.legacy_pool_id = gcp.id
        AND gi.status = 'available'
        AND gi.assigned_to_recipient_id IS NULL
    )
  ORDER BY gcp.available_cards DESC, gcp.created_at ASC
  LIMIT 1;

  IF v_pool_id IS NOT NULL THEN
    RETURN v_pool_id;
  END IF;

  -- Fallback: pools with legacy available_cards count
  SELECT id INTO v_pool_id
  FROM gift_card_pools
  WHERE client_id = p_client_id
    AND brand_id = p_brand_id
    AND card_value = p_card_value
    AND is_active = true
    AND available_cards > 0
  ORDER BY available_cards DESC, created_at ASC
  LIMIT 1;

  RETURN v_pool_id;
END;
$$;
