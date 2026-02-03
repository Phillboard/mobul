-- Step 4c: Updated is_card_available_for_assignment - checks gift_card_inventory
SET search_path TO public;

CREATE OR REPLACE FUNCTION public.is_card_available_for_assignment(card_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check inventory table first
  IF EXISTS (
    SELECT 1 FROM gift_card_inventory
    WHERE id = card_id
      AND status = 'available'
      AND assigned_to_recipient_id IS NULL
  ) THEN
    RETURN TRUE;
  END IF;

  -- Fallback to legacy table
  RETURN EXISTS (
    SELECT 1 FROM gift_cards
    WHERE id = card_id
      AND status = 'available'
      AND assigned_to_recipient_id IS NULL
  );
END;
$$;
