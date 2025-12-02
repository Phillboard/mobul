-- FIX SCRIPT 1: Link Campaign to Existing Contacts
-- Use this when contacts have audience_id but campaigns don't

DO $$
DECLARE
  v_campaign_name TEXT := 'spring 2689';  -- CHANGE THIS to your campaign name
  v_campaign_id UUID;
  v_audience_id UUID;
  v_contact_count INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Linking Campaign to Contacts';
  RAISE NOTICE '========================================';
  
  -- Get campaign ID
  SELECT id INTO v_campaign_id FROM campaigns WHERE name = v_campaign_name;
  
  IF v_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Campaign "%" not found!', v_campaign_name;
  END IF;
  
  -- Get the audience that AB6-1061 belongs to
  SELECT audience_id INTO v_audience_id 
  FROM recipients 
  WHERE redemption_code = 'AB6-1061'
  LIMIT 1;
  
  IF v_audience_id IS NULL THEN
    RAISE EXCEPTION 'Contact AB6-1061 has no audience_id! Run fix_orphaned_contacts first.';
  END IF;
  
  -- Count contacts in this audience
  SELECT COUNT(*) INTO v_contact_count
  FROM recipients
  WHERE audience_id = v_audience_id;
  
  RAISE NOTICE 'Found audience: % with % contacts', 
    (SELECT name FROM audiences WHERE id = v_audience_id),
    v_contact_count;
  
  -- Link campaign to audience
  UPDATE campaigns
  SET audience_id = v_audience_id
  WHERE id = v_campaign_id;
  
  RAISE NOTICE '✓ Campaign linked to audience!';
  RAISE NOTICE '';
  RAISE NOTICE 'Campaign: %', v_campaign_name;
  RAISE NOTICE 'Audience: %', (SELECT name FROM audiences WHERE id = v_audience_id);
  RAISE NOTICE 'Contacts: %', v_contact_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run setup_gift_card_config script';
  
END $$;

