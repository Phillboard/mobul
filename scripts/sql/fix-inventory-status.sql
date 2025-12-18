-- ============================================================
-- Fix Inventory Status - Diagnose and Reset Cards
-- ============================================================
-- Run this script to check inventory card status and reset
-- cards that should be available for provisioning.
-- ============================================================

-- 1. Diagnose: Check card status distribution
SELECT 
  status, 
  COUNT(*) as count
FROM gift_card_inventory 
GROUP BY status
ORDER BY count DESC;

-- 2. See cards by brand and status
SELECT 
  gcb.brand_name,
  gci.denomination,
  gci.status,
  COUNT(*) as count
FROM gift_card_inventory gci
JOIN gift_card_brands gcb ON gcb.id = gci.brand_id
GROUP BY gcb.brand_name, gci.denomination, gci.status
ORDER BY gcb.brand_name, gci.denomination, gci.status;

-- 3. Reset cards that were revoked back to available
UPDATE gift_card_inventory gci
SET 
  status = 'available',
  assigned_to_recipient_id = NULL,
  assigned_to_campaign_id = NULL,
  assigned_at = NULL
WHERE status = 'assigned'
AND EXISTS (
  SELECT 1 FROM recipient_gift_cards rgc
  WHERE rgc.inventory_card_id = gci.id
  AND rgc.delivery_status = 'revoked'
);

-- 4. Verify cards are now available
SELECT 
  status, 
  COUNT(*) as count
FROM gift_card_inventory 
GROUP BY status
ORDER BY count DESC;

-- 5. Show available cards by brand (what can be provisioned)
SELECT 
  gcb.brand_name,
  gci.denomination,
  COUNT(*) as available_count
FROM gift_card_inventory gci
JOIN gift_card_brands gcb ON gcb.id = gci.brand_id
WHERE gci.status = 'available'
GROUP BY gcb.brand_name, gci.denomination
ORDER BY gcb.brand_name, gci.denomination;

-- ============================================================
-- Done! Provisioning should now find available cards.
-- ============================================================
