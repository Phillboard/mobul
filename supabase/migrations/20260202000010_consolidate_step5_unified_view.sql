-- Step 5: Create unified_pool_cards view for backward-compatible pool card queries
SET search_path TO public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gift_cards')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gift_card_pools')
  THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.unified_pool_cards AS
      SELECT
        gi.id, gi.card_code, gi.card_number,
        gi.denomination as card_value, gi.status,
        gi.legacy_pool_id as pool_id, gi.brand_id,
        gi.assigned_to_recipient_id,
        gi.assigned_to_campaign_id as assignment_campaign_id,
        gi.assignment_condition_id, gi.assignment_source,
        gi.claimed_at, gi.claimed_by_agent_id, gi.delivered_at,
        gi.current_balance, gi.last_balance_check, gi.balance_check_status,
        gi.expiration_date, gi.created_at, gi.provider,
        'inventory'::text as source_table
      FROM public.gift_card_inventory gi
      UNION ALL
      SELECT
        gc.id, gc.card_code, gc.card_number,
        gc.card_value, gc.status,
        gc.pool_id, gcp.brand_id,
        gc.assigned_to_recipient_id,
        gc.assignment_campaign_id,
        gc.assignment_condition_id, gc.assignment_source,
        gc.claimed_at, gc.claimed_by_agent_id, gc.delivered_at,
        gc.current_balance, gc.last_balance_check, gc.balance_check_status,
        gc.expires_at::date as expiration_date, gc.created_at,
        gcp.provider,
        'legacy'::text as source_table
      FROM public.gift_cards gc
      JOIN public.gift_card_pools gcp ON gcp.id = gc.pool_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.gift_card_inventory gi
        WHERE gi.legacy_card_id = gc.id
      )
    $view$;

    -- Mark legacy table as deprecated
    COMMENT ON TABLE public.gift_cards IS
      'DEPRECATED: Legacy pool-based gift card model. Data has been migrated to gift_card_inventory. '
      'This table is kept as a read-only archive. All new operations should use gift_card_inventory.';
  ELSE
    -- Create a simple view from inventory only
    CREATE OR REPLACE VIEW public.unified_pool_cards AS
    SELECT
      gi.id, gi.card_code, gi.card_number,
      gi.denomination as card_value, gi.status,
      gi.legacy_pool_id as pool_id, gi.brand_id,
      gi.assigned_to_recipient_id,
      gi.assigned_to_campaign_id as assignment_campaign_id,
      gi.assignment_condition_id, gi.assignment_source,
      gi.claimed_at, gi.claimed_by_agent_id, gi.delivered_at,
      gi.current_balance, gi.last_balance_check, gi.balance_check_status,
      gi.expiration_date, gi.created_at, gi.provider,
      'inventory'::text as source_table
    FROM public.gift_card_inventory gi;
  END IF;
END $$;
