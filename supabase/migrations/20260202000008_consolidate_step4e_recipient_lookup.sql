-- Step 4e: Updated get_recipient_gift_card_for_condition - checks both tables
SET search_path TO public;

-- Must drop first because return type is changing
DROP FUNCTION IF EXISTS public.get_recipient_gift_card_for_condition(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_recipient_gift_card_for_condition(
  p_recipient_id uuid,
  p_condition_id uuid
) RETURNS TABLE(
  gift_card_id uuid,
  assigned_at timestamptz,
  delivered_at timestamptz,
  delivery_status text,
  card_code text,
  card_value numeric
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(rgc.inventory_card_id, rgc.gift_card_id) as gift_card_id,
    rgc.assigned_at,
    rgc.delivered_at,
    rgc.delivery_status,
    COALESCE(gi.card_code, gc.card_code) as card_code,
    COALESCE(gi.denomination, gc.card_value) as card_value
  FROM recipient_gift_cards rgc
  LEFT JOIN gift_card_inventory gi ON gi.id = rgc.inventory_card_id
  LEFT JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id
    AND rgc.condition_id = p_condition_id;
END;
$$;
