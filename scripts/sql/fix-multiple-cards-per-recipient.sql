-- ============================================================
-- Fix: Allow multiple gift cards per recipient per condition
-- ============================================================
-- The current unique constraint (recipient_id, condition_id) prevents
-- recipients from having multiple gift cards. We need to drop this
-- and create a new constraint based on inventory_card_id instead.
-- ============================================================

-- Step 1: Check current state
SELECT 
  'Current recipient_gift_cards' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN inventory_card_id IS NOT NULL THEN 1 END) as with_inventory_id
FROM recipient_gift_cards;

-- Step 2: Drop the problematic unique constraint
ALTER TABLE recipient_gift_cards 
  DROP CONSTRAINT IF EXISTS recipient_gift_cards_recipient_condition_unique;

-- Also try alternative constraint names
ALTER TABLE recipient_gift_cards 
  DROP CONSTRAINT IF EXISTS recipient_gift_cards_recipient_id_condition_id_key;

-- Step 3: Add a new constraint to prevent duplicate inventory cards
-- (but allow same recipient+condition to have multiple different cards)
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipient_gift_cards_inventory_unique 
  ON recipient_gift_cards(inventory_card_id) 
  WHERE inventory_card_id IS NOT NULL;

-- Step 4: Backfill missing records (one per billing entry)
INSERT INTO recipient_gift_cards (
  recipient_id,
  campaign_id,
  condition_id,
  inventory_card_id,
  delivery_status,
  assigned_at,
  created_at
)
SELECT 
  gbl.recipient_id,
  gbl.campaign_id,
  (SELECT cc.id FROM campaign_conditions cc 
   WHERE cc.campaign_id = gbl.campaign_id 
   LIMIT 1),
  gbl.inventory_card_id,
  'sent',
  COALESCE(gbl.billed_at, NOW()),
  COALESCE(gbl.billed_at, NOW())
FROM gift_card_billing_ledger gbl
WHERE gbl.inventory_card_id IS NOT NULL
  AND gbl.recipient_id IS NOT NULL
  AND gbl.campaign_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM recipient_gift_cards rgc 
    WHERE rgc.inventory_card_id = gbl.inventory_card_id
  );

-- Step 5: Verify
SELECT 
  'After fix' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN inventory_card_id IS NOT NULL THEN 1 END) as with_inventory_id
FROM recipient_gift_cards;

-- Show all records with inventory_card_id
SELECT 
  rgc.id,
  r.first_name,
  r.last_name,
  rgc.inventory_card_id,
  rgc.delivery_status
FROM recipient_gift_cards rgc
LEFT JOIN recipients r ON r.id = rgc.recipient_id
WHERE rgc.inventory_card_id IS NOT NULL
ORDER BY r.last_name, r.first_name;

-- ============================================================
-- Done! Each billing entry now has its own revoke record
-- ============================================================
