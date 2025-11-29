-- Gift Card Pool Population Script
-- Purpose: Add test/demo gift cards to existing pools for testing

-- Generate demo gift cards for pools that have 0 cards
DO $$
DECLARE
  pool_record RECORD;
  cards_to_generate INTEGER;
  card_counter INTEGER;
  batch_size INTEGER := 50; -- Generate 50 cards per pool
BEGIN
  -- Loop through empty pools
  FOR pool_record IN 
    SELECT 
      p.id,
      p.pool_name,
      p.card_value,
      p.provider,
      b.brand_name,
      b.brand_code
    FROM gift_card_pools p
    LEFT JOIN gift_card_brands b ON p.brand_id = b.id
    WHERE p.available_cards = 0
      OR p.total_cards = 0
  LOOP
    cards_to_generate := batch_size;
    RAISE NOTICE 'Generating % cards for pool: % (%)', cards_to_generate, pool_record.pool_name, pool_record.id;
    
    -- Generate gift cards for this pool
    FOR card_counter IN 1..cards_to_generate
    LOOP
      INSERT INTO gift_cards (
        pool_id,
        card_code,
        card_number,
        card_pin,
        card_value,
        provider,
        status,
        is_test_card
      ) VALUES (
        pool_record.id,
        'DEMO-' || pool_record.brand_code || '-' || LPAD(card_counter::TEXT, 6, '0') || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        '4111' || LPAD((1000 + card_counter)::TEXT, 12, '0'), -- Test card number
        LPAD((1000 + card_counter)::TEXT, 4, '0'), -- Test PIN
        pool_record.card_value,
        pool_record.provider,
        'available',
        true -- Mark as test card
      );
    END LOOP;
    
    -- Update pool counts
    UPDATE gift_card_pools
    SET 
      total_cards = total_cards + cards_to_generate,
      available_cards = available_cards + cards_to_generate
    WHERE id = pool_record.id;
    
    RAISE NOTICE 'Added % cards to pool %', cards_to_generate, pool_record.pool_name;
  END LOOP;
  
  RAISE NOTICE 'Gift card population complete!';
END $$;

-- Verify the results
SELECT 
  p.pool_name,
  b.brand_name,
  p.total_cards,
  p.available_cards,
  p.claimed_cards,
  p.delivered_cards,
  p.card_value
FROM gift_card_pools p
LEFT JOIN gift_card_brands b ON p.brand_id = b.id
WHERE p.is_master_pool = false
ORDER BY b.brand_name, p.pool_name;

-- Show pools that still need cards
SELECT 
  p.pool_name,
  b.brand_name,
  p.available_cards,
  p.total_cards
FROM gift_card_pools p
LEFT JOIN gift_card_brands b ON p.brand_id = b.id
WHERE p.available_cards = 0
ORDER BY b.brand_name;

