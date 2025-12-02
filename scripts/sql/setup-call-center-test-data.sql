-- Quick Test Data Setup for Call Center Demo
-- Run this in Supabase SQL Editor to create test codes immediately

-- Step 1: Get your current organization/client ID
-- Replace this with your actual client_id
DO $$
DECLARE
  v_client_id UUID;
  v_campaign_id UUID;
  v_audience_id UUID;
  v_brand_id UUID;
  v_denomination_id UUID;
  v_pool_id UUID;
BEGIN
  -- Get the first available client (or create one)
  SELECT id INTO v_client_id FROM clients LIMIT 1;
  
  IF v_client_id IS NULL THEN
    -- Create a test client
    INSERT INTO clients (name, status, created_at)
    VALUES ('Test Client - Mike Demo', 'active', NOW())
    RETURNING id INTO v_client_id;
  END IF;

  -- Create test audience
  INSERT INTO audiences (client_id, name, size, created_at)
  VALUES (v_client_id, 'Mike Demo Audience - Call Center Test', 10, NOW())
  RETURNING id INTO v_audience_id;

  -- Get or create Starbucks brand
  SELECT id INTO v_brand_id FROM gift_card_brands WHERE name ILIKE '%starbucks%' LIMIT 1;
  
  IF v_brand_id IS NULL THEN
    INSERT INTO gift_card_brands (name, provider, status, logo_url)
    VALUES ('Starbucks', 'Tillo', 'active', 'https://example.com/starbucks-logo.png')
    RETURNING id INTO v_brand_id;
  END IF;

  -- Get or create $25 denomination
  SELECT id INTO v_denomination_id FROM gift_card_denominations WHERE value = 25 LIMIT 1;
  
  IF v_denomination_id IS NULL THEN
    INSERT INTO gift_card_denominations (value, currency_code, created_at)
    VALUES (25, 'USD', NOW())
    RETURNING id INTO v_denomination_id;
  END IF;

  -- Create gift card pool
  INSERT INTO gift_card_pools (
    brand_id,
    denomination_id,
    pool_name,
    total_cards,
    available_cards,
    reserved_cards,
    low_stock_threshold,
    created_at
  ) VALUES (
    v_brand_id,
    v_denomination_id,
    'Starbucks $25 - Mike Demo Pool',
    20,
    20,
    0,
    5,
    NOW()
  ) RETURNING id INTO v_pool_id;

  -- Insert 20 test gift cards into the pool
  INSERT INTO gift_cards (
    pool_id,
    brand_id,
    denomination_id,
    card_code,
    pin_code,
    card_number,
    status,
    source,
    created_at
  )
  SELECT 
    v_pool_id,
    v_brand_id,
    v_denomination_id,
    'SBUX-DEMO-' || LPAD(n::text, 4, '0'),
    LPAD((1000 + n)::text, 4, '0'),
    'SBUX' || LPAD(n::text, 16, '0'),
    'available',
    'csv_import',
    NOW()
  FROM generate_series(1, 20) AS n;

  -- Create campaign
  INSERT INTO campaigns (
    client_id,
    audience_id,
    name,
    status,
    mail_date,
    size,
    mailing_method,
    created_at
  ) VALUES (
    v_client_id,
    v_audience_id,
    'Mike Demo - Call Center Test Campaign',
    'active',
    CURRENT_DATE,
    10,
    'customer_handled',
    NOW()
  ) RETURNING id INTO v_campaign_id;

  -- Create campaign condition for manual approval
  INSERT INTO campaign_conditions (
    campaign_id,
    condition_number,
    condition_name,
    trigger_type,
    is_active,
    created_at
  ) VALUES (
    v_campaign_id,
    1,
    'Sales Call Completion',
    'manual_approval',
    true,
    NOW()
  );

  -- Link gift card pool to campaign
  INSERT INTO campaign_reward_configs (
    campaign_id,
    condition_number,
    gift_card_pool_id,
    created_at
  ) VALUES (
    v_campaign_id,
    1,
    v_pool_id,
    NOW()
  );

  -- Insert 10 test recipients with unique codes
  INSERT INTO recipients (
    audience_id,
    redemption_code,
    first_name,
    last_name,
    email,
    phone,
    company,
    address1,
    city,
    state,
    zip,
    approval_status,
    sms_opt_in_status,
    created_at
  ) VALUES
  (v_audience_id, 'MIKE0001', 'John', 'Smith', 'john.smith@test.com', '+15551234567', 'AutoCare Plus', '123 Main St', 'Los Angeles', 'CA', '90210', 'pending', 'not_sent', NOW()),
  (v_audience_id, 'MIKE0002', 'Sarah', 'Johnson', 'sarah.j@test.com', '+15552345678', 'Premium Motors', '456 Oak Ave', 'San Diego', 'CA', '92101', 'pending', 'not_sent', NOW()),
  (v_audience_id, 'MIKE0003', 'Michael', 'Williams', 'mwilliams@test.com', '+15553456789', 'Elite Auto', '789 Pine Rd', 'San Francisco', 'CA', '94102', 'pending', 'not_sent', NOW()),
  (v_audience_id, 'MIKE0004', 'Emily', 'Brown', 'ebrown@test.com', '+15554567890', 'Quality Cars', '321 Elm St', 'Sacramento', 'CA', '95814', 'pending', 'not_sent', NOW()),
  (v_audience_id, 'MIKE0005', 'David', 'Jones', 'djones@test.com', '+15555678901', 'Best Auto', '654 Maple Dr', 'Fresno', 'CA', '93650', 'pending', 'not_sent', NOW()),
  (v_audience_id, 'MIKE0006', 'Lisa', 'Garcia', 'lgarcia@test.com', '+15556789012', 'Top Motors', '987 Cedar Ln', 'Long Beach', 'CA', '90802', 'pending', 'not_sent', NOW()),
  (v_audience_id, 'MIKE0007', 'Robert', 'Martinez', 'rmartinez@test.com', '+15557890123', 'Prime Auto', '147 Birch Way', 'Oakland', 'CA', '94601', 'pending', 'not_sent', NOW()),
  (v_audience_id, 'MIKE0008', 'Jennifer', 'Rodriguez', 'jrodriguez@test.com', '+15558901234', 'Superior Cars', '258 Spruce St', 'Bakersfield', 'CA', '93301', 'pending', 'not_sent', NOW()),
  (v_audience_id, 'MIKE0009', 'William', 'Hernandez', 'whernandez@test.com', '+15559012345', 'Excellent Auto', '369 Willow Ct', 'Anaheim', 'CA', '92801', 'pending', 'not_sent', NOW()),
  (v_audience_id, 'MIKE0010', 'Michelle', 'Lopez', 'mlopez@test.com', '+15550123456', 'Premier Motors', '741 Ash Blvd', 'Riverside', 'CA', '92501', 'pending', 'not_sent', NOW());

  -- Display success message
  RAISE NOTICE 'SUCCESS! Test data created:';
  RAISE NOTICE 'Client ID: %', v_client_id;
  RAISE NOTICE 'Campaign ID: %', v_campaign_id;
  RAISE NOTICE 'Audience ID: %', v_audience_id;
  RAISE NOTICE 'Pool ID: %', v_pool_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Test codes ready to use:';
  RAISE NOTICE 'MIKE0001 through MIKE0010';
  RAISE NOTICE '';
  RAISE NOTICE 'Try entering MIKE0001 in the call center now!';
END $$;

-- Verify the data was created
SELECT 
  'Verification Results' as status,
  COUNT(*) as recipient_count,
  STRING_AGG(redemption_code, ', ') as codes
FROM recipients
WHERE redemption_code LIKE 'MIKE%';

