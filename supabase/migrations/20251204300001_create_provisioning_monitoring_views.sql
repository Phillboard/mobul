-- =====================================================
-- Migration: Provisioning Monitoring Views
-- =====================================================
-- Creates views and functions for monitoring gift card
-- provisioning health and performance.
-- =====================================================

-- =====================================================
-- 1. Hourly Provisioning Health View
-- =====================================================

CREATE OR REPLACE VIEW v_provisioning_health_hourly AS
SELECT 
  date_trunc('hour', created_at) as hour,
  COUNT(DISTINCT request_id) as total_attempts,
  COUNT(DISTINCT request_id) FILTER (
    WHERE NOT EXISTS (
      SELECT 1 FROM gift_card_provisioning_trace t2 
      WHERE t2.request_id = gift_card_provisioning_trace.request_id 
      AND t2.status = 'failed'
    )
  ) as successful_attempts,
  COUNT(DISTINCT request_id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM gift_card_provisioning_trace t2 
      WHERE t2.request_id = gift_card_provisioning_trace.request_id 
      AND t2.status = 'failed'
    )
  ) as failed_attempts,
  ROUND(
    100.0 * COUNT(DISTINCT request_id) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM gift_card_provisioning_trace t2 
        WHERE t2.request_id = gift_card_provisioning_trace.request_id 
        AND t2.status = 'failed'
      )
    ) / NULLIF(COUNT(DISTINCT request_id), 0),
    2
  ) as success_rate,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 2) as avg_duration_ms
FROM gift_card_provisioning_trace
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', created_at)
ORDER BY hour DESC;

COMMENT ON VIEW v_provisioning_health_hourly IS 'Hourly aggregation of provisioning health metrics for trending';

-- =====================================================
-- 2. Top Provisioning Failures View
-- =====================================================

CREATE OR REPLACE VIEW v_top_provisioning_failures AS
SELECT 
  error_code,
  error_message,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT campaign_id) as affected_campaigns,
  COUNT(DISTINCT recipient_id) as affected_recipients,
  MAX(created_at) as last_occurred,
  MIN(created_at) as first_occurred
FROM gift_card_provisioning_trace
WHERE status = 'failed'
  AND error_code IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY error_code, error_message
ORDER BY occurrence_count DESC
LIMIT 20;

COMMENT ON VIEW v_top_provisioning_failures IS 'Top 20 most common provisioning failures in the last 7 days';

-- =====================================================
-- 3. Campaign Provisioning Stats View
-- =====================================================

CREATE OR REPLACE VIEW v_campaign_provisioning_stats AS
SELECT 
  campaign_id,
  c.name as campaign_name,
  COUNT(DISTINCT t.request_id) as total_attempts,
  COUNT(DISTINCT t.request_id) FILTER (
    WHERE NOT EXISTS (
      SELECT 1 FROM gift_card_provisioning_trace t2 
      WHERE t2.request_id = t.request_id 
      AND t2.status = 'failed'
    )
  ) as successful_provisions,
  COUNT(DISTINCT t.request_id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM gift_card_provisioning_trace t2 
      WHERE t2.request_id = t.request_id 
      AND t2.status = 'failed'
    )
  ) as failed_provisions,
  MAX(t.created_at) as last_provision_attempt,
  mode() WITHIN GROUP (ORDER BY t.error_code) FILTER (WHERE t.error_code IS NOT NULL) as most_common_error
FROM gift_card_provisioning_trace t
LEFT JOIN campaigns c ON c.id = t.campaign_id
WHERE t.created_at >= NOW() - INTERVAL '30 days'
GROUP BY campaign_id, c.name
ORDER BY total_attempts DESC;

COMMENT ON VIEW v_campaign_provisioning_stats IS 'Provisioning statistics per campaign for the last 30 days';

-- =====================================================
-- 4. Active Provisioning Issues View (for alerts)
-- =====================================================

CREATE OR REPLACE VIEW v_active_provisioning_issues AS
SELECT 
  cc.id as condition_id,
  cc.campaign_id,
  c.name as campaign_name,
  cc.condition_number,
  cc.condition_name,
  cc.brand_id,
  gcb.brand_name,
  cc.card_value,
  CASE 
    WHEN cc.brand_id IS NULL AND cc.card_value IS NULL THEN 'Missing brand and value'
    WHEN cc.brand_id IS NULL THEN 'Missing brand'
    WHEN cc.card_value IS NULL OR cc.card_value = 0 THEN 'Missing value'
    ELSE NULL
  END as config_issue,
  COALESCE(
    (SELECT COUNT(*) FROM gift_card_inventory 
     WHERE brand_id = cc.brand_id 
     AND denomination = cc.card_value 
     AND status = 'available'),
    0
  ) as available_inventory,
  cc.is_active,
  cc.created_at
FROM campaign_conditions cc
JOIN campaigns c ON c.id = cc.campaign_id
LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
WHERE cc.is_active = true
  AND c.status NOT IN ('completed')
  AND (
    cc.brand_id IS NULL 
    OR cc.card_value IS NULL 
    OR cc.card_value = 0
  )
ORDER BY cc.created_at DESC;

COMMENT ON VIEW v_active_provisioning_issues IS 'Active campaign conditions with configuration issues that will fail provisioning';

-- =====================================================
-- 5. Real-time Error Rate Function
-- =====================================================

CREATE OR REPLACE FUNCTION get_provisioning_error_rate_realtime(
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  total_requests BIGINT,
  failed_requests BIGINT,
  error_rate NUMERIC,
  errors_per_minute NUMERIC,
  is_elevated BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH request_stats AS (
    SELECT 
      request_id,
      MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
    FROM gift_card_provisioning_trace
    WHERE created_at >= NOW() - (p_window_minutes || ' minutes')::INTERVAL
    GROUP BY request_id
  )
  SELECT 
    NOW() - (p_window_minutes || ' minutes')::INTERVAL as window_start,
    NOW() as window_end,
    COUNT(*)::BIGINT as total_requests,
    SUM(is_failed)::BIGINT as failed_requests,
    ROUND(100.0 * SUM(is_failed) / NULLIF(COUNT(*), 0), 2) as error_rate,
    ROUND(SUM(is_failed)::NUMERIC / p_window_minutes, 2) as errors_per_minute,
    SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) > 0.1 as is_elevated  -- >10% error rate
  FROM request_stats;
END;
$$;

COMMENT ON FUNCTION get_provisioning_error_rate_realtime IS 'Get real-time error rate for provisioning within a time window';

-- =====================================================
-- 6. Step Performance Stats
-- =====================================================

CREATE OR REPLACE VIEW v_provisioning_step_performance AS
SELECT 
  step_name,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 2) as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as p95_duration_ms,
  MAX(duration_ms) as max_duration_ms
FROM gift_card_provisioning_trace
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY step_name
ORDER BY 
  CASE step_name
    WHEN 'Validate Input Parameters' THEN 1
    WHEN 'Get Billing Entity' THEN 2
    WHEN 'Check Entity Credits' THEN 3
    WHEN 'Get Brand Details' THEN 4
    WHEN 'Check Inventory Availability' THEN 5
    WHEN 'Claim from Inventory' THEN 6
    WHEN 'Check Tillo Configuration' THEN 7
    WHEN 'Provision from Tillo API' THEN 8
    WHEN 'Save Tillo Card to Inventory' THEN 9
    WHEN 'Get Pricing Configuration' THEN 10
    WHEN 'Record Billing Transaction' THEN 11
    WHEN 'Finalize and Return Result' THEN 12
    ELSE 99
  END;

COMMENT ON VIEW v_provisioning_step_performance IS 'Performance metrics for each provisioning step';

-- =====================================================
-- 7. Alert Thresholds Configuration Table
-- =====================================================

CREATE TABLE IF NOT EXISTS provisioning_alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL UNIQUE,
  warning_threshold NUMERIC NOT NULL,
  critical_threshold NUMERIC NOT NULL,
  comparison_operator TEXT NOT NULL DEFAULT '>' CHECK (comparison_operator IN ('>', '<', '>=', '<=')),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default thresholds
INSERT INTO provisioning_alert_thresholds (metric_name, warning_threshold, critical_threshold, comparison_operator) VALUES
  ('error_rate_percent', 5, 15, '>'),
  ('avg_duration_ms', 5000, 10000, '>'),
  ('failed_requests_per_hour', 10, 50, '>'),
  ('inventory_low_count', 10, 5, '<')
ON CONFLICT (metric_name) DO NOTHING;

COMMENT ON TABLE provisioning_alert_thresholds IS 'Configurable alert thresholds for provisioning monitoring';

-- =====================================================
-- 8. Grant Permissions
-- =====================================================

-- Views
GRANT SELECT ON v_provisioning_health_hourly TO authenticated;
GRANT SELECT ON v_top_provisioning_failures TO authenticated;
GRANT SELECT ON v_campaign_provisioning_stats TO authenticated;
GRANT SELECT ON v_active_provisioning_issues TO authenticated;
GRANT SELECT ON v_provisioning_step_performance TO authenticated;

-- Functions
GRANT EXECUTE ON FUNCTION get_provisioning_error_rate_realtime(INTEGER) TO authenticated;

-- Alert thresholds (admin only)
ALTER TABLE provisioning_alert_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage alert thresholds" ON provisioning_alert_thresholds;
CREATE POLICY "Admins can manage alert thresholds" ON provisioning_alert_thresholds
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

GRANT SELECT ON provisioning_alert_thresholds TO authenticated;

-- =====================================================
-- 9. Summary Function for Dashboard
-- =====================================================

CREATE OR REPLACE FUNCTION get_provisioning_dashboard_summary()
RETURNS TABLE (
  -- Overall health
  total_attempts_24h BIGINT,
  successful_24h BIGINT,
  failed_24h BIGINT,
  success_rate_24h NUMERIC,
  
  -- Performance
  avg_duration_ms NUMERIC,
  p95_duration_ms NUMERIC,
  
  -- Issues
  campaigns_with_issues BIGINT,
  conditions_needing_config BIGINT,
  
  -- Top error
  top_error_code TEXT,
  top_error_count BIGINT,
  
  -- Trend
  error_rate_trend TEXT  -- 'improving', 'stable', 'degrading'
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_rate NUMERIC;
  v_previous_rate NUMERIC;
BEGIN
  RETURN QUERY
  WITH last_24h AS (
    SELECT 
      request_id,
      MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
    FROM gift_card_provisioning_trace
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY request_id
  ),
  previous_24h AS (
    SELECT 
      request_id,
      MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
    FROM gift_card_provisioning_trace
    WHERE created_at >= NOW() - INTERVAL '48 hours'
      AND created_at < NOW() - INTERVAL '24 hours'
    GROUP BY request_id
  ),
  error_stats AS (
    SELECT 
      error_code,
      COUNT(*) as cnt
    FROM gift_card_provisioning_trace
    WHERE status = 'failed'
      AND error_code IS NOT NULL
      AND created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY error_code
    ORDER BY cnt DESC
    LIMIT 1
  ),
  duration_stats AS (
    SELECT 
      AVG(total_duration) as avg_dur,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration) as p95_dur
    FROM (
      SELECT request_id, SUM(duration_ms) as total_duration
      FROM gift_card_provisioning_trace
      WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND duration_ms IS NOT NULL
      GROUP BY request_id
    ) durations
  )
  SELECT 
    COUNT(*)::BIGINT as total_attempts_24h,
    COUNT(*) FILTER (WHERE is_failed = 0)::BIGINT as successful_24h,
    COUNT(*) FILTER (WHERE is_failed = 1)::BIGINT as failed_24h,
    ROUND(100.0 * COUNT(*) FILTER (WHERE is_failed = 0) / NULLIF(COUNT(*), 0), 2) as success_rate_24h,
    ROUND((SELECT avg_dur FROM duration_stats), 2) as avg_duration_ms,
    ROUND((SELECT p95_dur FROM duration_stats), 2) as p95_duration_ms,
    (SELECT COUNT(DISTINCT campaign_id) FROM v_active_provisioning_issues)::BIGINT as campaigns_with_issues,
    (SELECT COUNT(*) FROM v_active_provisioning_issues)::BIGINT as conditions_needing_config,
    (SELECT error_code FROM error_stats) as top_error_code,
    (SELECT cnt FROM error_stats) as top_error_count,
    CASE 
      WHEN (SELECT SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) FROM last_24h) <
           (SELECT SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) FROM previous_24h) - 0.05
        THEN 'improving'
      WHEN (SELECT SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) FROM last_24h) >
           (SELECT SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) FROM previous_24h) + 0.05
        THEN 'degrading'
      ELSE 'stable'
    END as error_rate_trend
  FROM last_24h;
END;
$$;

COMMENT ON FUNCTION get_provisioning_dashboard_summary IS 'Get comprehensive dashboard summary for provisioning health';

GRANT EXECUTE ON FUNCTION get_provisioning_dashboard_summary() TO authenticated;

-- =====================================================
-- 10. Log completion
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Provisioning monitoring views migration completed successfully';
END $$;

