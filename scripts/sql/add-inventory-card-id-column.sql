-- ============================================================
-- Add inventory_card_id column to recipient_gift_cards
-- ============================================================
-- This migration adds a new column to link recipient_gift_cards
-- to the gift_card_inventory table (new inventory system).
-- The existing gift_card_id column links to gift_cards (legacy).
-- ============================================================

-- Step 1: Add the new column
ALTER TABLE recipient_gift_cards 
  ADD COLUMN IF NOT EXISTS inventory_card_id UUID REFERENCES gift_card_inventory(id);

-- Step 2: Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_inventory_card 
  ON recipient_gift_cards(inventory_card_id) 
  WHERE inventory_card_id IS NOT NULL;

-- Step 3: Make condition_id nullable (inventory provisions may not have conditions)
ALTER TABLE recipient_gift_cards 
  ALTER COLUMN condition_id DROP NOT NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN recipient_gift_cards.inventory_card_id IS 
  'Links to gift_card_inventory.id for cards from the new inventory system';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'recipient_gift_cards' 
  AND column_name IN ('gift_card_id', 'inventory_card_id', 'condition_id');
