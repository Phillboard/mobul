-- =====================================================
-- CLEANUP DUPLICATE ASSIGNED CARDS
-- =====================================================
-- This migration fixes the issue where multiple cards were
-- assigned to the same recipient. It keeps only the most
-- recent card and returns others to 'available' status.
-- =====================================================

-- First, let's see what we're dealing with
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT assigned_to_recipient_id, COUNT(*) as card_count
    FROM gift_card_inventory
    WHERE status = 'assigned'
      AND assigned_to_recipient_id IS NOT NULL
    GROUP BY assigned_to_recipient_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Found % recipients with duplicate cards', v_count;
END $$;

-- Update duplicate cards to 'available', keeping only the most recent one per recipient
WITH ranked_cards AS (
  SELECT 
    id,
    assigned_to_recipient_id,
    assigned_at,
    ROW_NUMBER() OVER (
      PARTITION BY assigned_to_recipient_id 
      ORDER BY assigned_at DESC
    ) as rn
  FROM gift_card_inventory
  WHERE status = 'assigned'
    AND assigned_to_recipient_id IS NOT NULL
),
cards_to_release AS (
  SELECT id
  FROM ranked_cards
  WHERE rn > 1  -- All except the most recent
)
UPDATE gift_card_inventory
SET 
  status = 'available',
  assigned_to_recipient_id = NULL,
  assigned_to_campaign_id = NULL,
  assigned_at = NULL,
  notes = COALESCE(notes, '') || ' [Released: duplicate assignment cleanup ' || NOW()::TEXT || ']'
WHERE id IN (SELECT id FROM cards_to_release);

-- Log how many were cleaned up
DO $$
DECLARE
  v_released INTEGER;
BEGIN
  GET DIAGNOSTICS v_released = ROW_COUNT;
  RAISE NOTICE 'Released % duplicate card assignments', v_released;
END $$;

-- Verify the cleanup
DO $$
DECLARE
  v_remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM (
    SELECT assigned_to_recipient_id, COUNT(*) as card_count
    FROM gift_card_inventory
    WHERE status = 'assigned'
      AND assigned_to_recipient_id IS NOT NULL
    GROUP BY assigned_to_recipient_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_remaining > 0 THEN
    RAISE WARNING 'Still have % recipients with duplicate cards after cleanup', v_remaining;
  ELSE
    RAISE NOTICE 'All duplicate card assignments have been cleaned up';
  END IF;
END $$;

