-- ============================================================================
-- COMPLETE ANALYTICS DATA SEEDING
-- ============================================================================
-- This script links campaigns to audiences/recipients and generates all
-- tracking data, events, and analytics for comprehensive dashboard testing
-- ============================================================================

-- ============================================================================
-- PHASE 1: Link Campaigns to Audiences & Recipients
-- ============================================================================

DO $$
DECLARE
  campaign_rec RECORD;
  audience_id UUID;
  recipient_count INTEGER;
  i INTEGER;
  first_names TEXT[] := ARRAY['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica'];
  last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  cities TEXT[] := ARRAY['Austin:TX:78701', 'Dallas:TX:75201', 'Houston:TX:77001', 'Phoenix:AZ:85001', 'Denver:CO:80201'];
  city_parts TEXT[];
  recipient_ids UUID[];
BEGIN
  -- For each campaign without an audience
  FOR campaign_rec IN 
    SELECT c.id, c.client_id, c.name, c.status 
    FROM campaigns c 
    WHERE c.audience_id IS NULL 
    AND c.status != 'cancelled'
  LOOP
    -- Determine recipient count based on campaign size
    recipient_count := CASE 
      WHEN RANDOM() < 0.3 THEN 25   -- Small campaigns (30%)
      WHEN RANDOM() < 0.7 THEN 50   -- Medium campaigns (40%)
      ELSE 100                       -- Large campaigns (30%)
    END;
    
    -- Create audience for this campaign
    INSERT INTO audiences (
      client_id,
      name,
      source,
      status,
      total_count,
      valid_count,
      created_at
    ) VALUES (
      campaign_rec.client_id,
      campaign_rec.name || ' - Recipients',
      'import',
      'ready',
      recipient_count,
      recipient_count,
      NOW() - (RANDOM() * INTERVAL '60 days')
    )
    RETURNING id INTO audience_id;
    
    -- Link campaign to audience
    UPDATE campaigns 
    SET audience_id = audience_id
    WHERE id = campaign_rec.id;
    
    -- Create recipients for this campaign
    recipient_ids := ARRAY[]::UUID[];
    FOR i IN 1..recipient_count LOOP
      city_parts := STRING_TO_ARRAY(cities[(i % 5) + 1], ':');
      
      INSERT INTO recipients (
        audience_id,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        token,
        redemption_code,
        created_at
      ) VALUES (
        audience_id,
        first_names[(i % 16) + 1],
        last_names[(i % 10) + 1],
        'demo' || i || '.' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8) || '@testmail.com',
        '+1555' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0'),
        (100 + i)::TEXT || ' Test St',
        city_parts[1],
        city_parts[2],
        city_parts[3],
        SUBSTRING(MD5(RANDOM()::TEXT), 1, 16),
        'DEMO-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6),
        NOW() - (RANDOM() * INTERVAL '50 days')
      )
      RETURNING id INTO recipient_ids[i];
    END LOOP;
    
    RAISE NOTICE 'Created audience with % recipients for campaign: %', recipient_count, campaign_rec.name;
    
    -- Generate events for completed/in-progress campaigns
    IF campaign_rec.status IN ('completed', 'in_progress') THEN
      -- Generate PURL visits (30-60% of recipients)
      FOR i IN 1..GREATEST(1, FLOOR(recipient_count * (0.3 + RANDOM() * 0.3))) LOOP
        INSERT INTO events (
          recipient_id,
          campaign_id,
          event_type,
          event_data,
          created_at
        ) VALUES (
          recipient_ids[(i % recipient_count) + 1],
          campaign_rec.id,
          'purl_visit',
          jsonb_build_object(
            'browser', (ARRAY['Chrome', 'Safari', 'Firefox', 'Edge'])[FLOOR(RANDOM() * 4) + 1],
            'device', (ARRAY['desktop', 'mobile', 'tablet'])[FLOOR(RANDOM() * 3) + 1]
          ),
          NOW() - (RANDOM() * INTERVAL '30 days')
        );
      END LOOP;
      
      -- Generate QR scans (15-30% of recipients)
      FOR i IN 1..GREATEST(1, FLOOR(recipient_count * (0.15 + RANDOM() * 0.15))) LOOP
        INSERT INTO events (
          recipient_id,
          campaign_id,
          event_type,
          event_data,
          created_at
        ) VALUES (
          recipient_ids[(i % recipient_count) + 1],
          campaign_rec.id,
          'qr_scan',
          jsonb_build_object('device', 'mobile'),
          NOW() - (RANDOM() * INTERVAL '25 days')
        );
      END LOOP;
      
      -- Generate form submissions (10-20% of visitors)
      FOR i IN 1..GREATEST(1, FLOOR(recipient_count * (0.1 + RANDOM() * 0.1))) LOOP
        INSERT INTO events (
          recipient_id,
          campaign_id,
          event_type,
          event_data,
          created_at
        ) VALUES (
          recipient_ids[(i % recipient_count) + 1],
          campaign_rec.id,
          'form_submission',
          jsonb_build_object(
            'form_name', 'Lead Capture',
            'fields_submitted', 3
          ),
          NOW() - (RANDOM() * INTERVAL '20 days')
        );
      END LOOP;
      
      RAISE NOTICE 'Generated events for campaign: %', campaign_rec.name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ All campaigns now have audiences and recipients';
END $$;

-- ============================================================================
-- PHASE 2: Add Campaign Conditions and Reward Configs
-- ============================================================================

DO $$
DECLARE
  campaign_rec RECORD;
  pool_id UUID;
BEGIN
  -- For campaigns in progress or completed, add conditions
  FOR campaign_rec IN 
    SELECT c.id, c.client_id
    FROM campaigns c
    WHERE c.status IN ('in_progress', 'completed')
    AND NOT EXISTS (
      SELECT 1 FROM campaign_conditions WHERE campaign_id = c.id
    )
  LOOP
    -- Get a random pool for this client
    SELECT id INTO pool_id
    FROM gift_card_pools
    WHERE client_id = campaign_rec.client_id
    AND available_cards > 0
    ORDER BY RANDOM()
    LIMIT 1;
    
    IF pool_id IS NOT NULL THEN
      -- Add condition
      INSERT INTO campaign_conditions (
        campaign_id,
        condition_number,
        condition_name,
        condition_type,
        trigger_action,
        gift_card_pool_id,
        sms_template,
        is_required
      ) VALUES (
        campaign_rec.id,
        1,
        'Complete Form',
        'form_submission',
        'send_gift_card',
        pool_id,
        'Thank you! Your reward code: {{card_code}}',
        true
      )
      ON CONFLICT (campaign_id, condition_number) DO NOTHING;
      
      -- Add reward config
      INSERT INTO campaign_reward_configs (
        campaign_id,
        condition_number,
        gift_card_pool_id,
        reward_description,
        sms_template
      ) VALUES (
        campaign_rec.id,
        1,
        pool_id,
        '$25 Gift Card Reward',
        'Congratulations! Your gift card code is: {{card_code}}'
      )
      ON CONFLICT (campaign_id, condition_number) DO NOTHING;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Added conditions and rewards to campaigns';
END $$;

-- ============================================================================
-- VERIFICATION & SUMMARY
-- ============================================================================

SELECT 
  '✅ COMPLETE ANALYTICS DATA SEEDED' as status;

SELECT 
  'Campaigns with Audiences' as metric,
  COUNT(*) as count
FROM campaigns
WHERE audience_id IS NOT NULL;

SELECT 
  'Total Recipients' as metric,
  COUNT(*) as count
FROM recipients;

SELECT 
  'Total Events' as metric,
  COUNT(*) as count
FROM events;

SELECT 
  'Gift Cards Claimed' as metric,
  COUNT(*) as count
FROM gift_cards
WHERE status IN ('claimed', 'delivered');

RAISE NOTICE '🎉 Complete! All campaigns now have full analytics data';
RAISE NOTICE 'Check dashboards - they should now show rich metrics';

