-- ============================================================================
-- CLEANUP DUPLICATE GIFT CARD ASSIGNMENTS
-- ============================================================================
-- Purpose: Identify and fix recipients who received multiple gift cards 
--          for the same campaign condition
-- 
-- NOTE: This script only uses the recipient_gift_cards table which exists
--       in your database. The gift_card_deliveries table does not exist.
--
-- IMPORTANT: Run in a transaction and review the output before committing!
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create temporary table for audit trail
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS duplicate_cleanup_audit (
  id SERIAL PRIMARY KEY,
  recipient_id UUID,
  condition_id UUID,
  campaign_id UUID,
  gift_card_id UUID,
  action TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Check what gift card tracking tables exist
-- ============================================================================

SELECT 
  '=== AVAILABLE TABLES ===' as report_section;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('recipient_gift_cards', 'gift_card_deliveries', 'gift_cards', 'gift_card_inventory', 'gift_card_pools');

-- ============================================================================
-- STEP 3: Identify duplicates in recipient_gift_cards table
-- ============================================================================

SELECT 
  '=== DUPLICATE RECIPIENT_GIFT_CARDS REPORT ===' as report_section;

SELECT 
  rgc.recipient_id,
  rgc.condition_id,
  rgc.campaign_id,
  COUNT(*) as assignment_count,
  ARRAY_AGG(rgc.id ORDER BY rgc.assigned_at) as assignment_ids,
  ARRAY_AGG(rgc.gift_card_id ORDER BY rgc.assigned_at) as gift_card_ids,
  r.first_name,
  r.last_name,
  cc.condition_number
FROM recipient_gift_cards rgc
LEFT JOIN recipients r ON r.id = rgc.recipient_id
LEFT JOIN campaign_conditions cc ON cc.id = rgc.condition_id
WHERE rgc.recipient_id IS NOT NULL
  AND rgc.condition_id IS NOT NULL
GROUP BY rgc.recipient_id, rgc.condition_id, rgc.campaign_id, r.first_name, r.last_name, cc.condition_number
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ============================================================================
-- STEP 4: Count total duplicates
-- ============================================================================

SELECT 
  '=== SUMMARY ===' as report_section,
  (
    SELECT COUNT(*) FROM (
      SELECT recipient_id, condition_id
      FROM recipient_gift_cards
      WHERE recipient_id IS NOT NULL
        AND condition_id IS NOT NULL
      GROUP BY recipient_id, condition_id
      HAVING COUNT(*) > 1
    ) sub
  ) as duplicate_groups,
  (
    SELECT COALESCE(SUM(cnt - 1), 0) FROM (
      SELECT COUNT(*) as cnt
      FROM recipient_gift_cards
      WHERE recipient_id IS NOT NULL
        AND condition_id IS NOT NULL
      GROUP BY recipient_id, condition_id
      HAVING COUNT(*) > 1
    ) sub
  ) as extra_assignments_to_remove;

-- ============================================================================
-- STEP 5: Identify which assignments to keep vs delete
-- ============================================================================

SELECT 
  '=== ASSIGNMENTS TO DELETE (keeping first by assigned_at) ===' as report_section;

WITH assignments_to_keep AS (
  SELECT DISTINCT ON (recipient_id, condition_id)
    id,
    recipient_id,
    condition_id,
    assigned_at
  FROM recipient_gift_cards
  WHERE recipient_id IS NOT NULL
    AND condition_id IS NOT NULL
  ORDER BY recipient_id, condition_id, assigned_at ASC
)
SELECT 
  rgc.id as will_delete_id,
  rgc.recipient_id,
  rgc.condition_id,
  rgc.gift_card_id,
  rgc.assigned_at,
  r.first_name,
  r.last_name
FROM recipient_gift_cards rgc
LEFT JOIN recipients r ON r.id = rgc.recipient_id
WHERE NOT EXISTS (
  SELECT 1 FROM assignments_to_keep atk WHERE atk.id = rgc.id
)
AND rgc.recipient_id IS NOT NULL
AND rgc.condition_id IS NOT NULL
AND EXISTS (
  -- Only show if there are duplicates for this recipient/condition
  SELECT 1 FROM recipient_gift_cards rgc2
  WHERE rgc2.recipient_id = rgc.recipient_id
    AND rgc2.condition_id = rgc.condition_id
    AND rgc2.id != rgc.id
)
ORDER BY rgc.recipient_id, rgc.condition_id, rgc.assigned_at;

-- ============================================================================
-- STEP 6: Log what we're about to delete
-- ============================================================================

WITH assignments_to_keep AS (
  SELECT DISTINCT ON (recipient_id, condition_id)
    id
  FROM recipient_gift_cards
  WHERE recipient_id IS NOT NULL
    AND condition_id IS NOT NULL
  ORDER BY recipient_id, condition_id, assigned_at ASC
)
INSERT INTO duplicate_cleanup_audit (recipient_id, condition_id, campaign_id, gift_card_id, action, details)
SELECT 
  rgc.recipient_id,
  rgc.condition_id,
  rgc.campaign_id,
  rgc.gift_card_id,
  'delete_duplicate_assignment',
  jsonb_build_object(
    'assignment_id', rgc.id,
    'assigned_at', rgc.assigned_at,
    'reason', 'Duplicate assignment for same recipient/condition - keeping earlier one'
  )
FROM recipient_gift_cards rgc
WHERE NOT EXISTS (
  SELECT 1 FROM assignments_to_keep atk WHERE atk.id = rgc.id
)
AND rgc.recipient_id IS NOT NULL
AND rgc.condition_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM recipient_gift_cards rgc2
  WHERE rgc2.recipient_id = rgc.recipient_id
    AND rgc2.condition_id = rgc.condition_id
    AND rgc2.id != rgc.id
);

-- ============================================================================
-- STEP 7: Delete the duplicate assignments
-- ============================================================================

DELETE FROM recipient_gift_cards
WHERE id IN (
  WITH assignments_to_keep AS (
    SELECT DISTINCT ON (recipient_id, condition_id)
      id
    FROM recipient_gift_cards
    WHERE recipient_id IS NOT NULL
      AND condition_id IS NOT NULL
    ORDER BY recipient_id, condition_id, assigned_at ASC
  )
  SELECT rgc.id
  FROM recipient_gift_cards rgc
  WHERE NOT EXISTS (
    SELECT 1 FROM assignments_to_keep atk WHERE atk.id = rgc.id
  )
  AND rgc.recipient_id IS NOT NULL
  AND rgc.condition_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM recipient_gift_cards rgc2
    WHERE rgc2.recipient_id = rgc.recipient_id
      AND rgc2.condition_id = rgc.condition_id
      AND rgc2.id != rgc.id
  )
);

-- ============================================================================
-- STEP 8: Show cleanup results
-- ============================================================================

SELECT 
  '=== CLEANUP RESULTS ===' as report_section;

SELECT 
  action,
  COUNT(*) as count
FROM duplicate_cleanup_audit
GROUP BY action;

SELECT 
  '=== AUDIT LOG ===' as report_section;

SELECT * FROM duplicate_cleanup_audit ORDER BY created_at;

-- ============================================================================
-- STEP 9: Verify no duplicates remain
-- ============================================================================

SELECT 
  '=== VERIFICATION ===' as report_section;

SELECT 
  'recipient_gift_cards' as table_name,
  COUNT(*) as remaining_duplicates
FROM (
  SELECT recipient_id, condition_id
  FROM recipient_gift_cards
  WHERE recipient_id IS NOT NULL
    AND condition_id IS NOT NULL
  GROUP BY recipient_id, condition_id
  HAVING COUNT(*) > 1
) sub;

-- ============================================================================
-- TO COMMIT: Change ROLLBACK to COMMIT below
-- ============================================================================

-- Review the output above before committing!
-- If everything looks good, change ROLLBACK to COMMIT

ROLLBACK;
-- COMMIT;

SELECT 'Script completed. Review output above and change ROLLBACK to COMMIT to apply changes.' as status;
