-- =====================================================
-- GIFT CARD SYSTEM - SEED DATA
-- =====================================================
-- Migration: Seed initial data for testing gift card system
-- Creates Starbucks brand with denominations and sample inventory
-- =====================================================

-- =====================================================
-- 1. ENSURE STARBUCKS BRAND EXISTS AND IS ENABLED
-- =====================================================

INSERT INTO gift_card_brands (
  brand_name,
  brand_code,
  tillo_brand_code,
  provider,
  category,
  logo_url,
  is_enabled_by_admin,
  is_active,
  balance_check_enabled
) VALUES (
  'Starbucks',
  'starbucks',
  'starbucks',
  'tillo',
  'food_beverage',
  'https://logo.clearbit.com/starbucks.com',
  true,
  true,
  false
)
ON CONFLICT (brand_code) 
DO UPDATE SET
  is_enabled_by_admin = true,
  is_active = true,
  logo_url = 'https://logo.clearbit.com/starbucks.com',
  category = 'food_beverage';

-- =====================================================
-- 2. CREATE DENOMINATIONS FOR STARBUCKS
-- =====================================================

-- Get Starbucks brand_id
DO $$
DECLARE
  v_brand_id UUID;
BEGIN
  SELECT id INTO v_brand_id
  FROM gift_card_brands
  WHERE brand_code = 'starbucks';

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Starbucks brand not found';
  END IF;

  -- Insert denominations
  INSERT INTO gift_card_denominations (
    brand_id,
    denomination,
    is_enabled_by_admin,
    use_custom_pricing,
    client_price,
    cost_basis
  ) VALUES
    (v_brand_id, 5, true, false, NULL, 4.50),
    (v_brand_id, 10, true, false, NULL, 9.00),
    (v_brand_id, 25, true, false, NULL, 22.50),
    (v_brand_id, 50, true, false, NULL, 45.00)
  ON CONFLICT (brand_id, denomination) 
  DO UPDATE SET
    is_enabled_by_admin = true,
    cost_basis = EXCLUDED.cost_basis;

END $$;

-- =====================================================
-- 3. CREATE SAMPLE CSV INVENTORY
-- =====================================================

-- Create 50 sample gift cards for Starbucks (10 of each denomination)
DO $$
DECLARE
  v_brand_id UUID;
  v_batch_id UUID;
  i INTEGER;
BEGIN
  SELECT id INTO v_brand_id
  FROM gift_card_brands
  WHERE brand_code = 'starbucks';

  v_batch_id := gen_random_uuid();

  -- $5 cards (10 cards)
  FOR i IN 1..10 LOOP
    INSERT INTO gift_card_inventory (
      brand_id,
      denomination,
      card_code,
      card_number,
      expiration_date,
      status,
      upload_batch_id,
      notes
    ) VALUES (
      v_brand_id,
      5,
      'SB05-' || LPAD(i::TEXT, 4, '0') || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8),
      '6006' || LPAD((1000 + i)::TEXT, 12, '0'),
      CURRENT_DATE + INTERVAL '1 year',
      'available',
      v_batch_id,
      'Test seed data - $5 Starbucks'
    )
    ON CONFLICT (card_code) DO NOTHING;
  END LOOP;

  -- $10 cards (15 cards)
  FOR i IN 1..15 LOOP
    INSERT INTO gift_card_inventory (
      brand_id,
      denomination,
      card_code,
      card_number,
      expiration_date,
      status,
      upload_batch_id,
      notes
    ) VALUES (
      v_brand_id,
      10,
      'SB10-' || LPAD(i::TEXT, 4, '0') || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8),
      '6006' || LPAD((2000 + i)::TEXT, 12, '0'),
      CURRENT_DATE + INTERVAL '1 year',
      'available',
      v_batch_id,
      'Test seed data - $10 Starbucks'
    )
    ON CONFLICT (card_code) DO NOTHING;
  END LOOP;

  -- $25 cards (15 cards)
  FOR i IN 1..15 LOOP
    INSERT INTO gift_card_inventory (
      brand_id,
      denomination,
      card_code,
      card_number,
      expiration_date,
      status,
      upload_batch_id,
      notes
    ) VALUES (
      v_brand_id,
      25,
      'SB25-' || LPAD(i::TEXT, 4, '0') || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8),
      '6006' || LPAD((3000 + i)::TEXT, 12, '0'),
      CURRENT_DATE + INTERVAL '1 year',
      'available',
      v_batch_id,
      'Test seed data - $25 Starbucks'
    )
    ON CONFLICT (card_code) DO NOTHING;
  END LOOP;

  -- $50 cards (10 cards)
  FOR i IN 1..10 LOOP
    INSERT INTO gift_card_inventory (
      brand_id,
      denomination,
      card_code,
      card_number,
      expiration_date,
      status,
      upload_batch_id,
      notes
    ) VALUES (
      v_brand_id,
      50,
      'SB50-' || LPAD(i::TEXT, 4, '0') || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8),
      '6006' || LPAD((4000 + i)::TEXT, 12, '0'),
      CURRENT_DATE + INTERVAL '1 year',
      'available',
      v_batch_id,
      'Test seed data - $50 Starbucks'
    )
    ON CONFLICT (card_code) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created 50 sample Starbucks gift cards';
END $$;

-- =====================================================
-- 4. ENABLE STARBUCKS FOR ALL CLIENTS
-- =====================================================

-- Add Starbucks to all existing clients (all denominations)
DO $$
DECLARE
  v_brand_id UUID;
  v_client_record RECORD;
BEGIN
  SELECT id INTO v_brand_id
  FROM gift_card_brands
  WHERE brand_code = 'starbucks';

  FOR v_client_record IN SELECT id FROM clients LOOP
    -- Insert all denominations for this client
    INSERT INTO client_available_gift_cards (
      client_id,
      brand_id,
      denomination,
      is_enabled
    ) VALUES
      (v_client_record.id, v_brand_id, 5, true),
      (v_client_record.id, v_brand_id, 10, true),
      (v_client_record.id, v_brand_id, 25, true),
      (v_client_record.id, v_brand_id, 50, true)
    ON CONFLICT (client_id, brand_id, denomination) 
    DO UPDATE SET is_enabled = true;
  END LOOP;

  RAISE NOTICE 'Enabled Starbucks gift cards for all clients';
END $$;

-- =====================================================
-- 5. ADD SAMPLE CUSTOM PRICING (OPTIONAL)
-- =====================================================

-- Example: Set custom pricing on $10 denomination
-- Uncomment to enable:
/*
DO $$
DECLARE
  v_brand_id UUID;
BEGIN
  SELECT id INTO v_brand_id
  FROM gift_card_brands
  WHERE brand_code = 'starbucks';

  UPDATE gift_card_denominations
  SET 
    use_custom_pricing = true,
    client_price = 12.00,  -- Charge clients $12 for $10 card
    agency_price = 11.00,  -- Charge agencies $11 for $10 card
    cost_basis = 9.00      -- We paid $9 per card
  WHERE brand_id = v_brand_id
    AND denomination = 10;

  RAISE NOTICE 'Set custom pricing on $10 Starbucks cards';
END $$;
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count inventory by denomination
SELECT 
  denomination,
  COUNT(*) as total_cards,
  COUNT(*) FILTER (WHERE status = 'available') as available,
  COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered
FROM gift_card_inventory gci
JOIN gift_card_brands gcb ON gcb.id = gci.brand_id
WHERE gcb.brand_code = 'starbucks'
GROUP BY denomination
ORDER BY denomination;

-- Show enabled clients
SELECT 
  c.name as client_name,
  COUNT(DISTINCT cagc.denomination) as enabled_denominations
FROM clients c
LEFT JOIN client_available_gift_cards cagc ON cagc.client_id = c.id
WHERE cagc.is_enabled = true
GROUP BY c.id, c.name
ORDER BY c.name;

