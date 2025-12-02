-- FIX SCRIPT 2: Create Audience and Link Orphaned Contacts  
-- Use this when contacts have NO audience_id

DO $$
DECLARE
  v_audience_id UUID;
  v_client_id UUID;
  v_orphaned_count INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Creating Audience for Orphaned Contacts';
  RAISE NOTICE '========================================';
  
  -- Count orphaned contacts
  SELECT COUNT(*) INTO v_orphaned_count
  FROM recipients
  WHERE audience_id IS NULL;
  
  IF v_orphaned_count = 0 THEN
    RAISE NOTICE 'No orphaned contacts found. All contacts already have audiences.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found % orphaned contacts', v_orphaned_count;
  
  -- Get client_id from first campaign (or set manually)
  SELECT client_id INTO v_client_id 
  FROM campaigns 
  WHERE client_id IS NOT NULL
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    SELECT id INTO v_client_id FROM clients LIMIT 1;
  END IF;
  
  -- Create new audience
  INSERT INTO audiences (name, client_id, size, created_at)
  VALUES (
    'Imported Contacts - ' || TO_CHAR(NOW(), 'YYYY-MM-DD'),
    v_client_id,
    v_orphaned_count,
    NOW()
  )
  RETURNING id INTO v_audience_id;
  
  RAISE NOTICE 'Created audience ID: %', v_audience_id;
  
  -- Link all orphaned contacts to this audience
  UPDATE recipients
  SET audience_id = v_audience_id
  WHERE audience_id IS NULL;
  
  RAISE NOTICE '✓ Linked % contacts to new audience', v_orphaned_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Audience Name: Imported Contacts - %', TO_CHAR(NOW(), 'YYYY-MM-DD');
  RAISE NOTICE 'Audience ID: %', v_audience_id;
  RAISE NOTICE 'Contacts: %', v_orphaned_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run link_campaign_to_contacts script to link a campaign to this audience';
  
END $$;

