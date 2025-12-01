-- Create automatic inventory monitoring system
-- Triggers low-inventory alerts and notifies admins

-- Function: Check inventory levels and send alerts
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS void AS $$
DECLARE
  v_pool RECORD;
  v_threshold_percentage NUMERIC := 20.0; -- Alert when below 20%
  v_critical_threshold INTEGER := 10; -- Critical alert when < 10 cards
BEGIN
  FOR v_pool IN 
    SELECT 
      gcp.id,
      gcp.client_id,
      gcp.pool_name,
      gcp.available_cards,
      gcp.total_cards,
      gcp.card_value,
      gcb.brand_name,
      c.name as client_name
    FROM gift_card_pools gcp
    JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
    JOIN clients c ON c.id = gcp.client_id
    WHERE gcp.is_active = TRUE
      AND gcp.available_cards > 0 -- Not completely empty
      AND gcp.total_cards > 0
      AND (
        -- Below percentage threshold
        (gcp.available_cards::NUMERIC / NULLIF(gcp.total_cards, 0) * 100) < v_threshold_percentage
        -- OR below critical threshold
        OR gcp.available_cards < v_critical_threshold
      )
  LOOP
    -- Calculate percentage
    DECLARE
      v_percentage NUMERIC;
      v_severity TEXT;
      v_alert_type TEXT;
    BEGIN
      v_percentage := (v_pool.available_cards::NUMERIC / NULLIF(v_pool.total_cards, 1) * 100);
      
      -- Determine severity
      IF v_pool.available_cards < v_critical_threshold THEN
        v_severity := 'critical';
        v_alert_type := 'inventory_critical';
      ELSE
        v_severity := 'warning';
        v_alert_type := 'inventory_low';
      END IF;

      -- Check if alert already exists (don't spam)
      IF NOT EXISTS (
        SELECT 1 FROM system_alerts
        WHERE alert_type = v_alert_type
          AND metadata->>'pool_id' = v_pool.id::TEXT
          AND dismissed = FALSE
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        -- Create alert
        INSERT INTO system_alerts (
          alert_type,
          title,
          message,
          severity,
          metadata
        ) VALUES (
          v_alert_type,
          format('Low Inventory: %s %s', v_pool.brand_name, v_pool.card_value),
          format('Pool "%s" for client %s has only %s cards remaining (%.1f%% of capacity). Please replenish inventory.',
            v_pool.pool_name,
            v_pool.client_name,
            v_pool.available_cards,
            v_percentage
          ),
          v_severity,
          jsonb_build_object(
            'pool_id', v_pool.id,
            'client_id', v_pool.client_id,
            'brand_name', v_pool.brand_name,
            'card_value', v_pool.card_value,
            'available_cards', v_pool.available_cards,
            'total_cards', v_pool.total_cards,
            'percentage', v_percentage
          )
        );

        RAISE NOTICE 'Created % alert for pool: %', v_severity, v_pool.pool_name;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get low inventory summary for dashboard
CREATE OR REPLACE FUNCTION get_low_inventory_summary()
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  total_low_pools INTEGER,
  critical_pools INTEGER,
  warning_pools INTEGER,
  pools_detail JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH pool_status AS (
    SELECT 
      gcp.client_id,
      c.name as client_name,
      gcp.id as pool_id,
      gcp.pool_name,
      gcp.available_cards,
      gcp.total_cards,
      gcb.brand_name,
      CASE 
        WHEN gcp.available_cards < 10 THEN 'critical'
        WHEN (gcp.available_cards::NUMERIC / NULLIF(gcp.total_cards, 1) * 100) < 20 THEN 'warning'
        ELSE 'ok'
      END as status_level
    FROM gift_card_pools gcp
    JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
    JOIN clients c ON c.id = gcp.client_id
    WHERE gcp.is_active = TRUE
      AND gcp.total_cards > 0
  )
  SELECT 
    ps.client_id,
    ps.client_name,
    COUNT(*) FILTER (WHERE ps.status_level IN ('warning', 'critical'))::INTEGER as total_low_pools,
    COUNT(*) FILTER (WHERE ps.status_level = 'critical')::INTEGER as critical_pools,
    COUNT(*) FILTER (WHERE ps.status_level = 'warning')::INTEGER as warning_pools,
    jsonb_agg(
      jsonb_build_object(
        'pool_id', ps.pool_id,
        'pool_name', ps.pool_name,
        'brand_name', ps.brand_name,
        'available_cards', ps.available_cards,
        'total_cards', ps.total_cards,
        'status', ps.status_level
      )
    ) FILTER (WHERE ps.status_level IN ('warning', 'critical')) as pools_detail
  FROM pool_status ps
  WHERE ps.status_level IN ('warning', 'critical')
  GROUP BY ps.client_id, ps.client_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cron job to run inventory checks (requires pg_cron extension)
-- Note: This requires the pg_cron extension to be installed
-- Run this manually in production or use an external scheduler

/*
-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule inventory check every hour
SELECT cron.schedule(
  'check-inventory-levels',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT check_inventory_levels();$$
);
*/

-- Manual trigger: Call this to check inventory on demand
COMMENT ON FUNCTION check_inventory_levels IS 'Checks all pools for low inventory and creates alerts';
COMMENT ON FUNCTION get_low_inventory_summary IS 'Returns summary of low inventory pools per client';

GRANT EXECUTE ON FUNCTION check_inventory_levels TO authenticated;
GRANT EXECUTE ON FUNCTION check_inventory_levels TO service_role;
GRANT EXECUTE ON FUNCTION get_low_inventory_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_inventory_summary TO service_role;

-- Create view for easy monitoring
CREATE OR REPLACE VIEW v_inventory_health AS
SELECT 
  gcp.id as pool_id,
  gcp.client_id,
  c.name as client_name,
  gcb.brand_name,
  gcp.card_value,
  gcp.pool_name,
  gcp.available_cards,
  gcp.total_cards,
  gcp.claimed_cards,
  ROUND((gcp.available_cards::NUMERIC / NULLIF(gcp.total_cards, 1) * 100), 1) as availability_percentage,
  CASE 
    WHEN gcp.available_cards = 0 THEN 'empty'
    WHEN gcp.available_cards < 10 THEN 'critical'
    WHEN (gcp.available_cards::NUMERIC / NULLIF(gcp.total_cards, 1) * 100) < 20 THEN 'low'
    WHEN (gcp.available_cards::NUMERIC / NULLIF(gcp.total_cards, 1) * 100) < 50 THEN 'medium'
    ELSE 'healthy'
  END as health_status,
  gcp.created_at,
  gcp.updated_at
FROM gift_card_pools gcp
JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
JOIN clients c ON c.id = gcp.client_id
WHERE gcp.is_active = TRUE
ORDER BY 
  CASE 
    WHEN gcp.available_cards = 0 THEN 1
    WHEN gcp.available_cards < 10 THEN 2
    WHEN (gcp.available_cards::NUMERIC / NULLIF(gcp.total_cards, 1) * 100) < 20 THEN 3
    ELSE 4
  END,
  gcp.available_cards ASC;

COMMENT ON VIEW v_inventory_health IS 'Real-time view of all pool inventory health status';

GRANT SELECT ON v_inventory_health TO authenticated;

