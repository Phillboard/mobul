-- Campaign-Audience Data Linking Script
-- Purpose: Link existing campaigns to their audiences for analytics display

-- Update campaigns to link to their audiences based on recipients
-- This fixes the "No Audience" issue that prevents analytics from displaying

DO $$
DECLARE
  campaign_record RECORD;
  linked_count INTEGER := 0;
BEGIN
  -- Loop through campaigns without audience_id
  FOR campaign_record IN 
    SELECT id, name FROM campaigns WHERE audience_id IS NULL
  LOOP
    -- Try to find contact list from recipients
    UPDATE campaigns c
    SET audience_id = (
      SELECT DISTINCT r.contact_list_id 
      FROM recipients r 
      WHERE r.campaign_id = campaign_record.id 
        AND r.contact_list_id IS NOT NULL
      LIMIT 1
    )
    WHERE c.id = campaign_record.id
      AND EXISTS (
        SELECT 1 FROM recipients r 
        WHERE r.campaign_id = campaign_record.id 
          AND r.contact_list_id IS NOT NULL
      );
    
    IF FOUND THEN
      linked_count := linked_count + 1;
      RAISE NOTICE 'Linked campaign: % (ID: %)', campaign_record.name, campaign_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total campaigns linked: %', linked_count;
  
  -- Also fix any campaigns with recipients but no audience
  UPDATE campaigns c
  SET audience_id = (
    SELECT DISTINCT contact_list_id 
    FROM recipients r 
    WHERE r.campaign_id = c.id 
      AND r.contact_list_id IS NOT NULL
    LIMIT 1
  )
  WHERE audience_id IS NULL
    AND EXISTS (
      SELECT 1 FROM recipients r 
      WHERE r.campaign_id = c.id 
        AND r.contact_list_id IS NOT NULL
    );
    
  GET DIAGNOSTICS linked_count = ROW_COUNT;
  RAISE NOTICE 'Additional campaigns auto-linked: %', linked_count;
  
END $$;

-- Verify the fix
SELECT 
  COUNT(*) as total_campaigns,
  COUNT(audience_id) as campaigns_with_audience,
  COUNT(*) - COUNT(audience_id) as campaigns_missing_audience
FROM campaigns;

-- Show campaigns that still need manual attention
SELECT 
  id,
  name,
  status,
  created_at,
  (SELECT COUNT(*) FROM recipients r WHERE r.campaign_id = campaigns.id) as recipient_count
FROM campaigns
WHERE audience_id IS NULL
ORDER BY created_at DESC;

