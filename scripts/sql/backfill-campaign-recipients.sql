-- ============================================================================
-- Backfill Campaign Recipient Counts
-- ============================================================================
-- This script calculates and updates the total_recipients field for campaigns
-- that currently have 0 recipients but have an audience configuration.
-- 
-- Run this after deploying the preview-campaign-audience edge function.
-- ============================================================================

-- Function to calculate recipients for a campaign
CREATE OR REPLACE FUNCTION calculate_campaign_recipients(
  p_campaign_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_recipient_count INTEGER := 0;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign
  FROM marketing_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate based on audience type
  CASE v_campaign.audience_type
    WHEN 'all_contacts' THEN
      SELECT COUNT(*) INTO v_recipient_count
      FROM contacts
      WHERE client_id = v_campaign.client_id
        AND do_not_contact = false
        AND (
          (v_campaign.campaign_type = 'email' AND NOT email_opt_out) OR
          (v_campaign.campaign_type = 'sms' AND NOT sms_opt_out) OR
          (v_campaign.campaign_type = 'both' AND (NOT email_opt_out OR NOT sms_opt_out))
        );

    WHEN 'contact_list' THEN
      IF jsonb_array_length(COALESCE(v_campaign.audience_config->'listIds', '[]'::jsonb)) > 0 THEN
        SELECT COUNT(DISTINCT c.id) INTO v_recipient_count
        FROM contact_list_members clm
        JOIN contacts c ON c.id = clm.contact_id
        WHERE clm.list_id = ANY(
          SELECT jsonb_array_elements_text(v_campaign.audience_config->'listIds')::uuid
        )
          AND c.do_not_contact = false
          AND (
            (v_campaign.campaign_type = 'email' AND NOT c.email_opt_out) OR
            (v_campaign.campaign_type = 'sms' AND NOT c.sms_opt_out) OR
            (v_campaign.campaign_type = 'both' AND (NOT c.email_opt_out OR NOT c.sms_opt_out))
          );
      END IF;

    WHEN 'manual' THEN
      IF jsonb_array_length(COALESCE(v_campaign.audience_config->'contactIds', '[]'::jsonb)) > 0 THEN
        SELECT COUNT(*) INTO v_recipient_count
        FROM contacts c
        WHERE c.id = ANY(
          SELECT jsonb_array_elements_text(v_campaign.audience_config->'contactIds')::uuid
        )
          AND c.do_not_contact = false
          AND (
            (v_campaign.campaign_type = 'email' AND NOT c.email_opt_out) OR
            (v_campaign.campaign_type = 'sms' AND NOT c.sms_opt_out) OR
            (v_campaign.campaign_type = 'both' AND (NOT c.email_opt_out OR NOT c.sms_opt_out))
          );
      END IF;

    ELSE
      -- segment or other types not implemented yet
      v_recipient_count := 0;
  END CASE;

  RETURN v_recipient_count;
END;
$$;

-- Update all campaigns with 0 recipients
DO $$
DECLARE
  v_campaign RECORD;
  v_count INTEGER;
  v_updated INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting recipient count backfill...';

  FOR v_campaign IN 
    SELECT id, name, audience_type
    FROM marketing_campaigns
    WHERE total_recipients = 0
      AND status IN ('draft', 'scheduled')
    ORDER BY created_at DESC
  LOOP
    v_count := calculate_campaign_recipients(v_campaign.id);
    
    UPDATE marketing_campaigns
    SET total_recipients = v_count,
        updated_at = NOW()
    WHERE id = v_campaign.id;

    v_updated := v_updated + 1;
    
    RAISE NOTICE 'Campaign "%" (%) - % recipients calculated', 
      v_campaign.name, 
      v_campaign.audience_type,
      v_count;
  END LOOP;

  RAISE NOTICE 'Backfill complete. Updated % campaigns.', v_updated;
END;
$$;

-- Display summary
SELECT 
  status,
  COUNT(*) as campaign_count,
  SUM(total_recipients) as total_recipients,
  AVG(total_recipients) as avg_recipients
FROM marketing_campaigns
GROUP BY status
ORDER BY status;

-- Show campaigns with their recipient counts
SELECT 
  id,
  name,
  campaign_type,
  audience_type,
  status,
  total_recipients,
  sent_count,
  created_at
FROM marketing_campaigns
ORDER BY created_at DESC
LIMIT 20;
