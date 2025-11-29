-- ============================================================================
-- COMPREHENSIVE DEMO DATA SEEDING SCRIPT
-- ============================================================================
-- This script generates realistic dummy data for complete system testing
-- All data is clearly marked as DEMO and can be cleaned up before production
-- ============================================================================

-- Run the demo brand flag migration first
\i supabase/migrations/20251127_add_demo_brand_flag.sql

-- ============================================================================
-- PHASE 1: FAKE GIFT CARD BRANDS
-- ============================================================================

INSERT INTO gift_card_brands (
  brand_name,
  brand_code,
  provider,
  logo_url,
  category,
  typical_denominations,
  balance_check_enabled,
  is_active,
  is_demo_brand
) VALUES
  ('DemoCoffee', 'demo_coffee', 'demo', NULL, 'food_beverage', '[5,10,15,25]'::jsonb, false, true, true),
  ('FakeRetail', 'fake_retail', 'demo', NULL, 'retail', '[25,50,100]'::jsonb, false, true, true),
  ('TestBurger', 'test_burger', 'demo', NULL, 'food_beverage', '[10,15,20,25]'::jsonb, false, true, true),
  ('MockElectronics', 'mock_electronics', 'demo', NULL, 'electronics', '[50,100,200]'::jsonb, false, true, true),
  ('SampleBooks', 'sample_books', 'demo', NULL, 'retail', '[10,25,50]'::jsonb, false, true, true),
  ('DemoGaming', 'demo_gaming', 'demo', NULL, 'entertainment', '[20,50,100]'::jsonb, false, true, true),
  ('TestGrocery', 'test_grocery', 'demo', NULL, 'food_beverage', '[25,50,75,100]'::jsonb, false, true, true),
  ('FakeFashion', 'fake_fashion', 'demo', NULL, 'retail', '[25,50,100]'::jsonb, false, true, true)
ON CONFLICT (brand_code) DO UPDATE SET
  is_demo_brand = EXCLUDED.is_demo_brand;

-- ============================================================================
-- PHASE 2: DEMO ORGANIZATIONS & CLIENTS
-- ============================================================================

-- Demo Agency 1
INSERT INTO organizations (id, name, org_type)
VALUES 
  ('d1000000-0000-0000-0000-000000000001', 'Demo Agency 1', 'agency'),
  ('d2000000-0000-0000-0000-000000000002', 'Demo Agency 2', 'agency')
ON CONFLICT (id) DO NOTHING;

-- Clients for Demo Agency 1
INSERT INTO clients (id, org_id, name, industry, timezone, credits)
VALUES 
  ('dc100000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Tech Startup Co', 'technology', 'America/Los_Angeles', 10000),
  ('dc100000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'Healthcare Clinic', 'healthcare', 'America/New_York', 10000),
  ('dc100000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'Real Estate Firm', 'real_estate', 'America/Chicago', 10000),
  ('dc100000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'Auto Dealership', 'automotive', 'America/Phoenix', 10000),
  ('dc100000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'Dental Practice', 'healthcare', 'America/Denver', 10000),
  
  -- Clients for Demo Agency 2
  ('dc200000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', 'Law Firm Partners', 'legal', 'America/New_York', 10000),
  ('dc200000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002', 'Restaurant Group', 'restaurant', 'America/Los_Angeles', 10000),
  ('dc200000-0000-0000-0000-000000000003', 'd2000000-0000-0000-0000-000000000002', 'Fitness Center', 'health_fitness', 'America/Chicago', 10000),
  ('dc200000-0000-0000-0000-000000000004', 'd2000000-0000-0000-0000-000000000002', 'Home Services Pro', 'home_services', 'America/Denver', 10000),
  ('dc200000-0000-0000-0000-000000000005', 'd2000000-0000-0000-0000-000000000002', 'Insurance Agency', 'insurance', 'America/Phoenix', 10000)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PHASE 3: DEMO GIFT CARD POOLS (One pool per brand per client)
-- ============================================================================

DO $$
DECLARE
  brand_rec RECORD;
  client_rec RECORD;
  pool_id UUID;
BEGIN
  -- For each demo brand and client, create a pool
  FOR brand_rec IN SELECT id, brand_name, brand_code FROM gift_card_brands WHERE is_demo_brand = true LOOP
    FOR client_rec IN SELECT id, name FROM clients WHERE id LIKE 'dc%' LOOP
      pool_id := gen_random_uuid();
      
      INSERT INTO gift_card_pools (
        id,
        client_id,
        brand_id,
        pool_name,
        card_value,
        provider,
        total_cards,
        available_cards,
        purchase_method,
        low_stock_threshold
      ) VALUES (
        pool_id,
        client_rec.id,
        brand_rec.id,
        'Demo Pool - ' || brand_rec.brand_name || ' - ' || client_rec.name,
        25.00,
        'demo',
        100,
        100,
        'csv_only',
        10
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created demo gift card pools';
END $$;

-- ============================================================================
-- PHASE 4: DEMO GIFT CARDS (100 cards per pool)
-- ============================================================================

DO $$
DECLARE
  pool_rec RECORD;
  i INTEGER;
  card_status TEXT;
BEGIN
  FOR pool_rec IN SELECT id, brand_id FROM gift_card_pools WHERE pool_name LIKE 'Demo Pool%' LOOP
    FOR i IN 1..100 LOOP
      -- Status distribution: 60% available, 20% claimed, 15% delivered, 5% failed
      IF i <= 60 THEN
        card_status := 'available';
      ELSIF i <= 80 THEN
        card_status := 'claimed';
      ELSIF i <= 95 THEN
        card_status := 'delivered';
      ELSE
        card_status := 'failed';
      END IF;
      
      INSERT INTO gift_cards (
        pool_id,
        brand_id,
        card_code,
        card_number,
        pin,
        card_value,
        status,
        created_at
      ) VALUES (
        pool_rec.id,
        pool_rec.brand_id,
        'DEMO-' || LPAD(i::TEXT, 4, '0') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8) || '-' || SUBSTRING(MD5(pool_rec.id::TEXT), 1, 4),
        '6011' || LPAD((1000000000 + i)::TEXT, 12, '0'),
        LPAD((i * 7)::TEXT, 4, '0'),
        25.00,
        card_status,
        NOW() - (RANDOM() * INTERVAL '30 days')
      )
      ON CONFLICT (card_code) DO NOTHING;
    END LOOP;
  END LOOP;
  
  -- Update pool counts
  UPDATE gift_card_pools SET
    available_cards = (SELECT COUNT(*) FROM gift_cards WHERE pool_id = gift_card_pools.id AND status = 'available'),
    claimed_cards = (SELECT COUNT(*) FROM gift_cards WHERE pool_id = gift_card_pools.id AND status = 'claimed'),
    delivered_cards = (SELECT COUNT(*) FROM gift_cards WHERE pool_id = gift_card_pools.id AND status = 'delivered'),
    failed_cards = (SELECT COUNT(*) FROM gift_cards WHERE pool_id = gift_card_pools.id AND status = 'failed')
  WHERE pool_name LIKE 'Demo Pool%';
  
  RAISE NOTICE 'Created demo gift cards';
END $$;

-- ============================================================================
-- PHASE 5: DEMO CONTACTS (50 per client = 500 total)
-- ============================================================================

DO $$
DECLARE
  client_rec RECORD;
  i INTEGER;
  first_names TEXT[] := ARRAY['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara'];
  last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  lifecycle_stages TEXT[] := ARRAY['lead', 'mql', 'sql', 'opportunity', 'customer'];
  cities TEXT[] := ARRAY['Austin:TX:78701', 'Dallas:TX:75201', 'Houston:TX:77001', 'Phoenix:AZ:85001', 'Denver:CO:80201'];
  city_parts TEXT[];
BEGIN
  FOR client_rec IN SELECT id FROM clients WHERE id LIKE 'dc%' LOOP
    FOR i IN 1..50 LOOP
      city_parts := STRING_TO_ARRAY(cities[(i % 5) + 1], ':');
      
      INSERT INTO contacts (
        client_id,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        lifecycle_stage,
        created_at
      ) VALUES (
        client_rec.id,
        first_names[(i % 10) + 1],
        last_names[(i % 10) + 1],
        LOWER(first_names[(i % 10) + 1]) || '.' || LOWER(last_names[(i % 10) + 1]) || i || '@testmail.com',
        '+1555' || LPAD(i::TEXT, 7, '0'),
        (100 + i)::TEXT || ' ' || (ARRAY['Main St', 'Oak Ave', 'Maple Dr'])[(i % 3) + 1],
        city_parts[1],
        city_parts[2],
        city_parts[3],
        lifecycle_stages[(i % 5) + 1],
        NOW() - (RANDOM() * INTERVAL '90 days')
      )
      ON CONFLICT (email) DO NOTHING;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created demo contacts';
END $$;

-- ============================================================================
-- PHASE 6: DEMO CONTACT LISTS (5 per client)
-- ============================================================================

DO $$
DECLARE
  client_rec RECORD;
  list_id UUID;
  list_names TEXT[] := ARRAY['Hot Leads - Q4 2025', 'Campaign Recipients - November', 'VIP Customers', 'Cold Outreach List', 'Referral Partners'];
  list_name TEXT;
BEGIN
  FOR client_rec IN SELECT id FROM clients WHERE id LIKE 'dc%' LOOP
    FOREACH list_name IN ARRAY list_names LOOP
      list_id := gen_random_uuid();
      
      INSERT INTO contact_lists (
        id,
        client_id,
        name,
        contact_count,
        created_at
      ) VALUES (
        list_id,
        client_rec.id,
        list_name,
        10,
        NOW() - (RANDOM() * INTERVAL '60 days')
      )
      ON CONFLICT DO NOTHING;
      
      -- Add 10 random contacts to each list
      INSERT INTO contact_list_members (list_id, contact_id)
      SELECT list_id, id FROM contacts 
      WHERE client_id = client_rec.id 
      ORDER BY RANDOM() 
      LIMIT 10
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created demo contact lists';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  'DEMO DATA SEEDED SUCCESSFULLY' as status,
  (SELECT COUNT(*) FROM gift_card_brands WHERE is_demo_brand = true) as demo_brands,
  (SELECT COUNT(*) FROM clients WHERE id LIKE 'dc%') as demo_clients,
  (SELECT COUNT(*) FROM gift_card_pools WHERE pool_name LIKE 'Demo Pool%') as demo_pools,
  (SELECT COUNT(*) FROM gift_cards WHERE card_code LIKE 'DEMO-%') as demo_cards,
  (SELECT COUNT(*) FROM contacts WHERE email LIKE '%@testmail.com') as demo_contacts,
  (SELECT COUNT(*) FROM contact_lists WHERE name LIKE '%Q4 2025%' OR name LIKE '%November%' OR name LIKE '%VIP%') as demo_lists;

RAISE NOTICE '✅ Phase 1-3 Complete: Brands, Pools, Cards, Contacts, Lists';
RAISE NOTICE '⏳ Run demo data generator UI for campaigns, events, and analytics';

