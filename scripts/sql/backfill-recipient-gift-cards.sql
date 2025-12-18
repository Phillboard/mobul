-- ============================================================
-- Backfill recipient_gift_cards from gift_card_billing_ledger
-- ============================================================
-- IMPORTANT: Run add-inventory-card-id-column.sql FIRST!
-- ============================================================

-- Check current state
SELECT 
  'Before backfill' as stage,
  COUNT(*) as total_recipient_gift_cards,
  COUNT(CASE WHEN inventory_card_id IS NOT NULL THEN 1 END) as with_inventory_card_id
FROM recipient_gift_cards;

-- ============================================================
-- STEP 1: UPDATE existing records to add inventory_card_id
-- ============================================================

UPDATE recipient_gift_cards rgc
SET inventory_card_id = (
  SELECT gbl.inventory_card_id 
  FROM gift_card_billing_ledger gbl
  WHERE gbl.recipient_id = rgc.recipient_id
    AND gbl.campaign_id = rgc.campaign_id
    AND gbl.inventory_card_id IS NOT NULL
  ORDER BY gbl.billed_at DESC
  LIMIT 1
)
WHERE rgc.inventory_card_id IS NULL
  AND EXISTS (
    SELECT 1 FROM gift_card_billing_ledger gbl
    WHERE gbl.recipient_id = rgc.recipient_id
      AND gbl.campaign_id = rgc.campaign_id
      AND gbl.inventory_card_id IS NOT NULL
  );

-- ============================================================
-- STEP 2: INSERT new records (one per unique recipient+condition)
-- ============================================================

INSERT INTO recipient_gift_cards (
  recipient_id,
  campaign_id,
  condition_id,
  inventory_card_id,
  delivery_status,
  assigned_at,
  created_at
)
SELECT DISTINCT ON (sub.recipient_id, sub.condition_id)
  sub.recipient_id,
  sub.campaign_id,
  sub.condition_id,
  sub.inventory_card_id,
  'sent',
  sub.billed_at,
  sub.billed_at
FROM (
  SELECT 
    gbl.recipient_id,
    gbl.campaign_id,
    (SELECT cc.id FROM campaign_conditions cc 
     WHERE cc.campaign_id = gbl.campaign_id 
     LIMIT 1) as condition_id,
    gbl.inventory_card_id,
    COALESCE(gbl.billed_at, NOW()) as billed_at
  FROM gift_card_billing_ledger gbl
  WHERE gbl.inventory_card_id IS NOT NULL
    AND gbl.recipient_id IS NOT NULL
    AND gbl.campaign_id IS NOT NULL
) sub
WHERE sub.condition_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM recipient_gift_cards rgc 
    WHERE rgc.recipient_id = sub.recipient_id
      AND rgc.condition_id = sub.condition_id
  )
ORDER BY sub.recipient_id, sub.condition_id, sub.billed_at DESC;

-- ============================================================
-- Verify
-- ============================================================

SELECT 
  'After backfill' as stage,
  COUNT(*) as total_recipient_gift_cards,
  COUNT(CASE WHEN inventory_card_id IS NOT NULL THEN 1 END) as with_inventory_card_id
FROM recipient_gift_cards;

-- Show sample
SELECT id, recipient_id, campaign_id, inventory_card_id, delivery_status
FROM recipient_gift_cards
WHERE inventory_card_id IS NOT NULL
LIMIT 5;

-- Done!
