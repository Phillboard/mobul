-- Enhanced Campaign System - PART 5: Notify Function
-- Split from original migration for CLI compatibility

CREATE OR REPLACE FUNCTION notify_pool_empty(
  p_pool_id UUID,
  p_campaign_id UUID,
  p_recipient_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $notify_func$
DECLARE
  v_pool RECORD;
  v_campaign RECORD;
  v_notification_id UUID;
BEGIN
  SELECT pool_name, client_id INTO v_pool
  FROM gift_card_pools
  WHERE id = p_pool_id;

  SELECT name INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id;

  INSERT INTO admin_notifications (
    notification_type,
    title,
    message,
    metadata,
    priority,
    client_id,
    campaign_id,
    pool_id
  ) VALUES (
    'pool_empty',
    'Gift Card Pool Empty',
    format('Pool "%s" has no available cards. Campaign "%s" attempted to provision a card but failed.', 
           v_pool.pool_name, v_campaign.name),
    jsonb_build_object(
      'pool_id', p_pool_id,
      'pool_name', v_pool.pool_name,
      'campaign_id', p_campaign_id,
      'campaign_name', v_campaign.name,
      'recipient_id', p_recipient_id,
      'timestamp', NOW()
    ),
    'high',
    v_pool.client_id,
    p_campaign_id,
    p_pool_id
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$notify_func$;

