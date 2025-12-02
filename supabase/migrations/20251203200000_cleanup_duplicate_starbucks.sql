-- Cleanup duplicate Starbucks brands
-- Keep only the one with brand_code = 'starbucks'

DO $$
DECLARE
  v_correct_brand_id UUID;
  v_duplicate_brand RECORD;
BEGIN
  -- Get the correct Starbucks brand
  SELECT id INTO v_correct_brand_id
  FROM gift_card_brands
  WHERE brand_code = 'starbucks';

  -- Delete any Starbucks brands that don't have the correct brand_code
  FOR v_duplicate_brand IN 
    SELECT id, brand_name, brand_code
    FROM gift_card_brands
    WHERE brand_name ILIKE '%starbuc%'
      AND brand_code != 'starbucks'
  LOOP
    RAISE NOTICE 'Deleting duplicate brand: % (code: %)', v_duplicate_brand.brand_name, v_duplicate_brand.brand_code;
    
    -- Delete related records first (due to foreign keys)
    DELETE FROM client_available_gift_cards WHERE brand_id = v_duplicate_brand.id;
    DELETE FROM gift_card_denominations WHERE brand_id = v_duplicate_brand.id;
    DELETE FROM gift_card_inventory WHERE brand_id = v_duplicate_brand.id;
    
    -- Delete the brand itself
    DELETE FROM gift_card_brands WHERE id = v_duplicate_brand.id;
  END LOOP;

  RAISE NOTICE 'Cleanup complete. Remaining Starbucks brand: %', v_correct_brand_id;
END $$;

-- Verify - should only show one Starbucks
SELECT id, brand_name, brand_code, is_enabled_by_admin 
FROM gift_card_brands 
WHERE brand_name ILIKE '%starbuc%';

