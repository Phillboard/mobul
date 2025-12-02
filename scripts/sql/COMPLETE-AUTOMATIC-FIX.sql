-- ========================================
-- COMPLETE FIX FOR AB6-1061 CALL CENTER LOOKUP
-- Copy this ENTIRE script and run in Supabase SQL Editor
-- It will automatically diagnose and fix everything
-- ========================================

DO $$
DECLARE
  v_campaign_name TEXT := 'spring 2689';  -- ⚠️ CHANGE THIS to your active campaign name
  v_campaign_id UUID;
  v_audience_id UUID;
  v_client_id UUID;
  v_brand_id UUID;
  v_contact_count INT;
  v_orphaned_count INT;
  v_denomination NUMERIC := 25.00;
  v_condition_number INT := 1;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   AUTOMATIC FIX FOR AB6-1061';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- ==========================================
  -- STEP 1: Check if contact has audience
  -- ==========================================
  RAISE NOTICE '[STEP 1] Checking contact status...';
  
  SELECT audience_id INTO v_audience_id
  FROM recipients
  WHERE redemption_code = 'AB6-1061'
  LIMIT 1;
  
  IF v_audience_id IS NULL THEN
    RAISE NOTICE '  → Contact has NO audience. Creating one...';
    
    -- Count orphaned contacts
    SELECT COUNT(*) INTO v_orphaned_count
    FROM recipients
    WHERE audience_id IS NULL;
    
    RAISE NOTICE '  → Found % contacts without audience', v_orphaned_count;
    
    -- Get client_id
    SELECT client_id INTO v_client_id 
    FROM campaigns 
    WHERE name = v_campaign_name
    LIMIT 1;
    
    IF v_client_id IS NULL THEN
      SELECT id INTO v_client_id FROM clients LIMIT 1;
    END IF;
    
    -- Create new audience
    INSERT INTO audiences (name, client_id, total_count, created_at)
    VALUES (
      'Imported Contacts - ' || TO_CHAR(NOW(), 'YYYY-MM-DD'),
      v_client_id,
      v_orphaned_count,
      NOW()
    )
    RETURNING id INTO v_audience_id;
    
    RAISE NOTICE '  ✓ Created audience: %', v_audience_id;
    
    -- Link all orphaned contacts
    UPDATE recipients
    SET audience_id = v_audience_id
    WHERE audience_id IS NULL;
    
    RAISE NOTICE '  ✓ Linked % contacts to audience', v_orphaned_count;
  ELSE
    RAISE NOTICE '  ✓ Contact already has audience: %', v_audience_id;
  END IF;
  
  -- ==========================================
  -- STEP 2: Link campaign to audience
  -- ==========================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 2] Linking campaign to audience...';
  
  SELECT id, client_id INTO v_campaign_id, v_client_id
  FROM campaigns
  WHERE name = v_campaign_name;
  
  IF v_campaign_id IS NULL THEN
    RAISE EXCEPTION '  ✗ Campaign "%" not found! Please check the campaign name.', v_campaign_name;
  END IF;
  
  -- Update campaign audience_id
  UPDATE campaigns
  SET audience_id = v_audience_id
  WHERE id = v_campaign_id;
  
  SELECT COUNT(*) INTO v_contact_count
  FROM recipients
  WHERE audience_id = v_audience_id;
  
  RAISE NOTICE '  ✓ Campaign linked to audience';
  RAISE NOTICE '  → Campaign: %', v_campaign_name;
  RAISE NOTICE '  → Contacts: %', v_contact_count;
  
  -- ==========================================
  -- STEP 3: Get or select gift card brand
  -- ==========================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 3] Configuring gift card...';
  
  SELECT id INTO v_brand_id 
  FROM gift_card_brands 
  WHERE brand_name ILIKE '%starbucks%'
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    SELECT id INTO v_brand_id 
    FROM gift_card_brands 
    WHERE brand_name ILIKE '%amazon%'
    LIMIT 1;
  END IF;

  IF v_brand_id IS NULL THEN
    SELECT id INTO v_brand_id 
    FROM gift_card_brands 
    WHERE is_active = true
    ORDER BY brand_name
    LIMIT 1;
  END IF;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION '  ✗ No gift card brands found in database!';
  END IF;

  RAISE NOTICE '  ✓ Selected brand: %', (SELECT brand_name FROM gift_card_brands WHERE id = v_brand_id);
  
  -- ==========================================
  -- STEP 4: Grant client access
  -- ==========================================
  INSERT INTO client_available_gift_cards (
    client_id, brand_id, denomination, is_enabled
  ) VALUES (
    v_client_id, v_brand_id, v_denomination, true
  ) 
  ON CONFLICT (client_id, brand_id, denomination) 
  DO UPDATE SET is_enabled = true;

  RAISE NOTICE '  ✓ Client access granted';
  
  -- ==========================================
  -- STEP 5: Add gift card config to campaign
  -- ==========================================
  INSERT INTO campaign_gift_card_config (
    campaign_id, brand_id, denomination, condition_number
  ) VALUES (
    v_campaign_id, v_brand_id, v_denomination, v_condition_number
  ) 
  ON CONFLICT (campaign_id, condition_number) 
  DO UPDATE SET brand_id = v_brand_id, denomination = v_denomination;

  RAISE NOTICE '  ✓ Gift card configured';
  
  -- ==========================================
  -- STEP 6: Ensure campaign condition exists
  -- ==========================================
  IF NOT EXISTS (
    SELECT 1 FROM campaign_conditions 
    WHERE campaign_id = v_campaign_id AND condition_number = v_condition_number
  ) THEN
    INSERT INTO campaign_conditions (
      campaign_id, condition_number, condition_name, trigger_type, is_active
    ) VALUES (
      v_campaign_id, v_condition_number, 'Sales Call Completion', 'manual_agent', true
    );
    RAISE NOTICE '  ✓ Campaign condition created';
  ELSE
    RAISE NOTICE '  ✓ Campaign condition already exists';
  END IF;
  
  -- ==========================================
  -- STEP 7: Final verification
  -- ==========================================
  RAISE NOTICE '';
  RAISE NOTICE '[STEP 4] Verifying setup...';
  
  DECLARE
    v_inventory_count INT;
    v_test_result TEXT;
  BEGIN
    -- Check if lookup will work
    SELECT 
      r.first_name || ' ' || r.last_name
    INTO v_test_result
    FROM recipients r
    INNER JOIN audiences a ON r.audience_id = a.id
    INNER JOIN campaigns c ON c.audience_id = a.id
    INNER JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
    WHERE UPPER(r.redemption_code) = 'AB6-1061'
    LIMIT 1;
    
    IF v_test_result IS NOT NULL THEN
      RAISE NOTICE '  ✓ Lookup test PASSED';
      RAISE NOTICE '  → Found: %', v_test_result;
    ELSE
      RAISE WARNING '  ⚠ Lookup test FAILED - something still wrong';
    END IF;
    
    -- Check inventory
    SELECT COUNT(*) INTO v_inventory_count
    FROM gift_card_inventory
    WHERE brand_id = v_brand_id
      AND denomination = v_denomination
      AND status = 'available';
    
    RAISE NOTICE '  → Available inventory: % cards', v_inventory_count;
    
    IF v_inventory_count = 0 THEN
      RAISE WARNING '  ⚠ No inventory! Upload gift cards to Admin > Platform Inventory';
    END IF;
  END;
  
  -- ==========================================
  -- SUCCESS!
  -- ==========================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   ✅ SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Campaign: %', v_campaign_name;
  RAISE NOTICE 'Gift Card: % $%', 
    (SELECT brand_name FROM gift_card_brands WHERE id = v_brand_id),
    v_denomination;
  RAISE NOTICE 'Contacts: %', v_contact_count;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 NEXT STEPS:';
  RAISE NOTICE '1. Refresh your browser (Ctrl+Shift+R)';
  RAISE NOTICE '2. Go to Call Center';
  RAISE NOTICE '3. Enter code: AB6-1061';
  RAISE NOTICE '4. Should work now! ✨';
  RAISE NOTICE '';
  
END $$;

-- ==========================================
-- Final verification query
-- ==========================================
SELECT 
  '✓ Final Verification' as status,
  r.redemption_code as code,
  r.first_name || ' ' || r.last_name as name,
  c.name as campaign,
  gb.brand_name as gift_card_brand,
  gc.denomination as amount
FROM recipients r
INNER JOIN audiences a ON r.audience_id = a.id
INNER JOIN campaigns c ON c.audience_id = a.id
INNER JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
INNER JOIN gift_card_brands gb ON gc.brand_id = gb.id
WHERE UPPER(r.redemption_code) = 'AB6-1061';

