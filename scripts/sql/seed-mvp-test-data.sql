-- MVP Test Data Seeding Script
-- Run this if verification shows missing test data

-- ============================================================================
-- SECTION 1: Seed Gift Card Brands (if missing)
-- ============================================================================

INSERT INTO gift_card_brands (brand_name, brand_code, provider, category, typical_denominations, logo_url, is_active)
VALUES 
  ('Amazon', 'amazon', 'tillo', 'retail', '[10, 25, 50, 100, 250]', 'https://logo.clearbit.com/amazon.com', true),
  ('Starbucks', 'starbucks', 'tillo', 'food_beverage', '[5, 10, 15, 25, 50]', 'https://logo.clearbit.com/starbucks.com', true),
  ('Target', 'target', 'tillo', 'retail', '[10, 25, 50, 100]', 'https://logo.clearbit.com/target.com', true),
  ('Walmart', 'walmart', 'tillo', 'retail', '[10, 25, 50, 100, 250]', 'https://logo.clearbit.com/walmart.com', true),
  ('Visa', 'visa', 'tillo', 'prepaid', '[25, 50, 100, 200]', 'https://logo.clearbit.com/visa.com', true)
ON CONFLICT (brand_code) DO NOTHING;

-- ============================================================================
-- SECTION 2: Create Test Organization & Client (if missing)
-- ============================================================================

-- Insert test organization
INSERT INTO organizations (id, name, org_type)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Agency', 'agency')
ON CONFLICT (id) DO NOTHING;

-- Insert test client
INSERT INTO clients (id, org_id, name, industry, timezone, credits)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Test Client Co',
  'technology',
  'America/New_York',
  1000
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 3: Assign Current User to Test Client
-- ============================================================================

-- This assumes auth.uid() returns the current logged-in user
-- Assign user to test client (run when logged in)
DO $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    -- Assign role if not exists
    INSERT INTO user_roles (user_id, role)
    VALUES (current_user_id, 'admin')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Assign to client
    INSERT INTO client_users (user_id, client_id)
    VALUES (current_user_id, '00000000-0000-0000-0000-000000000002')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- SECTION 4: Create Test Gift Card Pool
-- ============================================================================

-- Create test gift card pool (you'll need to get the brand_id)
DO $$
DECLARE
  amazon_brand_id uuid;
  test_pool_id uuid;
  i integer;
BEGIN
  -- Get Amazon brand ID
  SELECT id INTO amazon_brand_id FROM gift_card_brands WHERE brand_code = 'amazon' LIMIT 1;
  
  IF amazon_brand_id IS NOT NULL THEN
    -- Create test pool
    INSERT INTO gift_card_pools (
      id,
      client_id,
      pool_name,
      brand_id,
      card_value,
      provider,
      total_cards,
      available_cards,
      purchase_method,
      low_stock_threshold
    )
    VALUES (
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000002',
      'Test Amazon $25 Pool',
      amazon_brand_id,
      25.00,
      'tillo',
      20,
      20,
      'csv_only',
      5
    )
    ON CONFLICT (id) DO UPDATE SET
      available_cards = 20,
      total_cards = 20;
    
    test_pool_id := '00000000-0000-0000-0000-000000000010';
    
    -- Insert 20 test gift cards
    FOR i IN 1..20 LOOP
      INSERT INTO gift_cards (
        pool_id,
        card_code,
        card_number,
        pin,
        status,
        brand_id,
        card_value
      )
      VALUES (
        test_pool_id,
        'TEST-' || LPAD(i::text, 4, '0') || '-' || SUBSTRING(MD5(RANDOM()::text), 1, 8),
        '6011' || LPAD((1000000000000 + i)::text, 12, '0'),
        LPAD(i::text, 4, '0'),
        'available',
        amazon_brand_id,
        25.00
      )
      ON CONFLICT (card_code) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created test pool with 20 cards';
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: Create Test Contacts
-- ============================================================================

-- Create test contact list
INSERT INTO contact_lists (id, client_id, name, contact_count)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000002',
  'Test Contact List',
  10
)
ON CONFLICT (id) DO NOTHING;

-- Insert 10 test contacts
INSERT INTO contacts (client_id, first_name, last_name, email, phone, address, city, state, zip, lifecycle_stage)
SELECT
  '00000000-0000-0000-0000-000000000002',
  'Test' || i,
  'Contact' || i,
  'test' || i || '@example.com',
  '+1555000' || LPAD(i::text, 4, '0'),
  (100 + i) || ' Test St',
  'Austin',
  'TX',
  '78701',
  'lead'
FROM generate_series(1, 10) as i
ON CONFLICT DO NOTHING;

-- Link contacts to list
INSERT INTO contact_list_members (list_id, contact_id)
SELECT 
  '00000000-0000-0000-0000-000000000020',
  c.id
FROM contacts c
WHERE c.client_id = '00000000-0000-0000-0000-000000000002'
LIMIT 10
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 6: Create Test Template
-- ============================================================================

INSERT INTO templates (
  id,
  client_id,
  name,
  size,
  is_starter_template,
  category,
  json_layers,
  thumbnail_url
)
VALUES (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000002',
  'Simple Test Template',
  '4x6',
  false,
  'promotion',
  '{"version": "1.0", "canvasSize": {"width": 1800, "height": 1200}, "backgroundColor": "#FFFFFF", "layers": [{"id": "text-1", "type": "text", "text": "Hello {{first_name}}!", "fontSize": 36, "fontFamily": "Arial", "fill": "#000000", "left": 100, "top": 100}]}',
  null
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ Test data seeded successfully' as status;
SELECT 'Run scripts/sql/verify-mvp-database.sql to check results' as next_step;

