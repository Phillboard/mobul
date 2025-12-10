-- =====================================================
-- FIX DUPLICATE CARDS FOR PASCALE FRITSCH
-- =====================================================
-- Keep only the most recent card, release the rest
-- =====================================================

-- First, find the recipient ID and see all their cards
DO $$
DECLARE
  v_recipient_id UUID;
  v_card_count INTEGER;
  v_keep_card_id UUID;
BEGIN
  -- Find Pascale Fritsch's recipient ID via their assigned cards
  SELECT DISTINCT gc.assigned_to_recipient_id INTO v_recipient_id
  FROM gift_card_inventory gc
  JOIN recipients r ON r.id = gc.assigned_to_recipient_id
  WHERE r.first_name ILIKE 'Pascale'
    AND r.last_name ILIKE 'Fritsch'
    AND gc.status = 'assigned'
  LIMIT 1;
  
  IF v_recipient_id IS NULL THEN
    RAISE NOTICE 'Pascale Fritsch not found with assigned cards';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found recipient ID: %', v_recipient_id;
  
  -- Count their cards
  SELECT COUNT(*) INTO v_card_count
  FROM gift_card_inventory
  WHERE assigned_to_recipient_id = v_recipient_id
    AND status = 'assigned';
  
  RAISE NOTICE 'Found % assigned cards', v_card_count;
  
  IF v_card_count <= 1 THEN
    RAISE NOTICE 'No duplicates to clean up';
    RETURN;
  END IF;
  
  -- Get the most recent card to keep
  SELECT id INTO v_keep_card_id
  FROM gift_card_inventory
  WHERE assigned_to_recipient_id = v_recipient_id
    AND status = 'assigned'
  ORDER BY assigned_at DESC
  LIMIT 1;
  
  RAISE NOTICE 'Keeping card ID: %', v_keep_card_id;
  
  -- Release all other cards
  UPDATE gift_card_inventory
  SET 
    status = 'available',
    assigned_to_recipient_id = NULL,
    assigned_to_campaign_id = NULL,
    assigned_at = NULL,
    notes = COALESCE(notes, '') || ' [Released: duplicate cleanup]'
  WHERE assigned_to_recipient_id = v_recipient_id
    AND status = 'assigned'
    AND id != v_keep_card_id;
  
  RAISE NOTICE 'Released % duplicate cards', v_card_count - 1;
END $$;

-- Also clean up any other recipients with duplicates
DO $$
DECLARE
  rec RECORD;
  v_keep_card_id UUID;
  v_released INTEGER := 0;
BEGIN
  -- Find all recipients with multiple assigned cards
  FOR rec IN 
    SELECT assigned_to_recipient_id, COUNT(*) as card_count
    FROM gift_card_inventory
    WHERE status = 'assigned'
      AND assigned_to_recipient_id IS NOT NULL
    GROUP BY assigned_to_recipient_id
    HAVING COUNT(*) > 1
  LOOP
    -- Get the most recent card to keep
    SELECT id INTO v_keep_card_id
    FROM gift_card_inventory
    WHERE assigned_to_recipient_id = rec.assigned_to_recipient_id
      AND status = 'assigned'
    ORDER BY assigned_at DESC
    LIMIT 1;
    
    -- Release all other cards
    UPDATE gift_card_inventory
    SET 
      status = 'available',
      assigned_to_recipient_id = NULL,
      assigned_to_campaign_id = NULL,
      assigned_at = NULL,
      notes = COALESCE(notes, '') || ' [Released: duplicate cleanup]'
    WHERE assigned_to_recipient_id = rec.assigned_to_recipient_id
      AND status = 'assigned'
      AND id != v_keep_card_id;
    
    v_released := v_released + (rec.card_count - 1);
  END LOOP;
  
  RAISE NOTICE 'Total released: % duplicate cards', v_released;
END $$;

