-- Step 2: Migrate gift_cards data into gift_card_inventory
SET search_path TO public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gift_cards')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gift_card_pools')
  THEN
    INSERT INTO public.gift_card_inventory (
      brand_id, denomination, card_code, card_number, expiration_date, status,
      uploaded_at, assigned_to_recipient_id, assigned_to_campaign_id, assigned_at,
      delivered_at, current_balance, last_balance_check, balance_check_status,
      legacy_pool_id, legacy_card_id, assignment_source, assignment_campaign_id,
      assignment_condition_id, claimed_at, claimed_by_agent_id, provider
    )
    SELECT
      gcp.brand_id,
      COALESCE(gc.card_value, gcp.card_value, 0),
      gc.card_code,
      gc.card_number,
      gc.expires_at::date,
      CASE gc.status
        WHEN 'available' THEN 'available'
        WHEN 'claimed' THEN 'assigned'
        WHEN 'delivered' THEN 'delivered'
        WHEN 'failed' THEN 'available'
        ELSE gc.status
      END,
      gc.created_at,
      gc.assigned_to_recipient_id,
      gc.assignment_campaign_id,
      gc.claimed_at,
      gc.delivered_at,
      gc.current_balance,
      gc.last_balance_check,
      COALESCE(gc.balance_check_status, 'unchecked'),
      gc.pool_id,
      gc.id,
      gc.assignment_source,
      gc.assignment_campaign_id,
      gc.assignment_condition_id,
      gc.claimed_at,
      gc.claimed_by_agent_id,
      gcp.provider
    FROM public.gift_cards gc
    JOIN public.gift_card_pools gcp ON gcp.id = gc.pool_id
    WHERE gcp.brand_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.gift_card_inventory gi
        WHERE gi.card_code = gc.card_code
      );

    RAISE NOTICE 'Data migration from gift_cards to gift_card_inventory complete';
  ELSE
    RAISE NOTICE 'gift_cards or gift_card_pools table not found, skipping data migration';
  END IF;
END $$;
