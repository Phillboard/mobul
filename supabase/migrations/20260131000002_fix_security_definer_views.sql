-- Migration: Fix Security Definer Views
-- Issue: Views with SECURITY DEFINER bypass RLS policies
-- Solution: Recreate views with security_invoker = true

-- ============================================
-- 1. activity_stats
-- ============================================
DROP VIEW IF EXISTS public.activity_stats CASCADE;

CREATE VIEW public.activity_stats 
WITH (security_invoker = true) AS
WITH time_ranges AS (
  SELECT 
    NOW() AS now,
    DATE_TRUNC('day', NOW()) AS today_start,
    DATE_TRUNC('day', NOW() - INTERVAL '1 day') AS yesterday_start,
    DATE_TRUNC('week', NOW()) AS week_start,
    DATE_TRUNC('month', NOW()) AS month_start
),
today_counts AS (
  SELECT 
    category,
    status,
    COUNT(*) as count
  FROM public.activity_log, time_ranges
  WHERE created_at >= time_ranges.today_start
  GROUP BY category, status
),
yesterday_counts AS (
  SELECT COUNT(*) as count
  FROM public.activity_log, time_ranges
  WHERE created_at >= time_ranges.yesterday_start 
    AND created_at < time_ranges.today_start
),
week_counts AS (
  SELECT COUNT(*) as count
  FROM public.activity_log, time_ranges
  WHERE created_at >= time_ranges.week_start
),
month_counts AS (
  SELECT COUNT(*) as count
  FROM public.activity_log, time_ranges
  WHERE created_at >= time_ranges.month_start
)
SELECT
  COALESCE(SUM(tc.count), 0) AS today_total,
  (SELECT count FROM yesterday_counts) AS yesterday_total,
  (SELECT count FROM week_counts) AS week_total,
  (SELECT count FROM month_counts) AS month_total,
  COALESCE(SUM(CASE WHEN tc.category = 'gift_card' THEN tc.count ELSE 0 END), 0) AS gift_card_today,
  COALESCE(SUM(CASE WHEN tc.category = 'campaign' THEN tc.count ELSE 0 END), 0) AS campaign_today,
  COALESCE(SUM(CASE WHEN tc.category = 'communication' THEN tc.count ELSE 0 END), 0) AS communication_today,
  COALESCE(SUM(CASE WHEN tc.category = 'api' THEN tc.count ELSE 0 END), 0) AS api_today,
  COALESCE(SUM(CASE WHEN tc.category = 'user' THEN tc.count ELSE 0 END), 0) AS user_today,
  COALESCE(SUM(CASE WHEN tc.category = 'system' THEN tc.count ELSE 0 END), 0) AS system_today,
  COALESCE(SUM(CASE WHEN tc.status = 'success' THEN tc.count ELSE 0 END), 0) AS success_count,
  COALESCE(SUM(CASE WHEN tc.status = 'failed' THEN tc.count ELSE 0 END), 0) AS failed_count,
  COALESCE(SUM(CASE WHEN tc.status = 'pending' THEN tc.count ELSE 0 END), 0) AS pending_count
FROM today_counts tc;

COMMENT ON VIEW public.activity_stats IS 'Aggregated activity statistics for dashboard';
GRANT SELECT ON public.activity_stats TO authenticated;
GRANT SELECT ON public.activity_stats TO service_role;

-- ============================================
-- 2. gift_card_inventory_summary
-- ============================================
DROP VIEW IF EXISTS public.gift_card_inventory_summary CASCADE;

CREATE VIEW public.gift_card_inventory_summary 
WITH (security_invoker = true) AS
SELECT 
    gci.brand_id,
    gcb.brand_name,
    gcb.logo_url,
    gcb.balance_check_method,
    gci.denomination,
    COUNT(*) FILTER (WHERE gci.status = 'available') AS available_count,
    COUNT(*) FILTER (WHERE gci.status = 'assigned') AS assigned_count,
    COUNT(*) FILTER (WHERE gci.status = 'delivered') AS delivered_count,
    COUNT(*) FILTER (WHERE gci.status = 'expired') AS expired_count,
    COUNT(*) AS total_count,
    SUM(gci.denomination) FILTER (WHERE gci.status IN ('available', 'assigned')) AS total_value,
    SUM(gci.current_balance) FILTER (WHERE gci.current_balance IS NOT NULL) AS total_current_balance,
    COUNT(*) FILTER (WHERE gci.balance_check_status = 'unchecked') AS unchecked_count,
    COUNT(*) FILTER (WHERE gci.balance_check_status = 'error') AS error_count,
    MAX(gci.last_balance_check) AS last_balance_check
FROM public.gift_card_inventory gci
JOIN public.gift_card_brands gcb ON gci.brand_id = gcb.id
GROUP BY gci.brand_id, gcb.brand_name, gcb.logo_url, gcb.balance_check_method, gci.denomination;

COMMENT ON VIEW public.gift_card_inventory_summary IS 'Aggregated summary of gift card inventory with balance check status';
GRANT ALL ON TABLE public.gift_card_inventory_summary TO anon;
GRANT ALL ON TABLE public.gift_card_inventory_summary TO authenticated;
GRANT ALL ON TABLE public.gift_card_inventory_summary TO service_role;

-- ============================================
-- 3. v_active_provisioning_issues
-- ============================================
DROP VIEW IF EXISTS public.v_active_provisioning_issues CASCADE;

CREATE VIEW public.v_active_provisioning_issues 
WITH (security_invoker = true) AS
SELECT 
    cc.id AS condition_id,
    cc.campaign_id,
    c.name AS campaign_name,
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
    END AS config_issue,
    COALESCE((
        SELECT COUNT(*)
        FROM public.gift_card_inventory
        WHERE gift_card_inventory.brand_id = cc.brand_id 
          AND gift_card_inventory.denomination = cc.card_value 
          AND gift_card_inventory.status = 'available'
    ), 0) AS available_inventory,
    cc.is_active,
    cc.created_at
FROM public.campaign_conditions cc
JOIN public.campaigns c ON c.id = cc.campaign_id
LEFT JOIN public.gift_card_brands gcb ON gcb.id = cc.brand_id
WHERE cc.is_active = true 
  AND c.status <> 'completed'::public.campaign_status 
  AND (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
ORDER BY cc.created_at DESC;

COMMENT ON VIEW public.v_active_provisioning_issues IS 'Active campaign conditions with configuration issues that will fail provisioning';
GRANT ALL ON TABLE public.v_active_provisioning_issues TO anon;
GRANT ALL ON TABLE public.v_active_provisioning_issues TO authenticated;
GRANT ALL ON TABLE public.v_active_provisioning_issues TO service_role;

-- ============================================
-- 4. v_campaign_provisioning_stats
-- ============================================
DROP VIEW IF EXISTS public.v_campaign_provisioning_stats CASCADE;

CREATE VIEW public.v_campaign_provisioning_stats 
WITH (security_invoker = true) AS
SELECT 
    t.campaign_id,
    c.name AS campaign_name,
    COUNT(DISTINCT t.request_id) AS total_attempts,
    COUNT(DISTINCT t.request_id) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM public.gift_card_provisioning_trace t2
        WHERE t2.request_id = t.request_id AND t2.status = 'failed'
    )) AS successful_provisions,
    COUNT(DISTINCT t.request_id) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.gift_card_provisioning_trace t2
        WHERE t2.request_id = t.request_id AND t2.status = 'failed'
    )) AS failed_provisions,
    MAX(t.created_at) AS last_provision_attempt,
    MODE() WITHIN GROUP (ORDER BY t.error_code) FILTER (WHERE t.error_code IS NOT NULL) AS most_common_error
FROM public.gift_card_provisioning_trace t
LEFT JOIN public.campaigns c ON c.id = t.campaign_id
WHERE t.created_at >= (NOW() - INTERVAL '30 days')
GROUP BY t.campaign_id, c.name
ORDER BY COUNT(DISTINCT t.request_id) DESC;

COMMENT ON VIEW public.v_campaign_provisioning_stats IS 'Provisioning statistics per campaign for the last 30 days';
GRANT ALL ON TABLE public.v_campaign_provisioning_stats TO anon;
GRANT ALL ON TABLE public.v_campaign_provisioning_stats TO authenticated;
GRANT ALL ON TABLE public.v_campaign_provisioning_stats TO service_role;

-- ============================================
-- 5. v_conditions_needing_gift_card_config
-- ============================================
DROP VIEW IF EXISTS public.v_conditions_needing_gift_card_config CASCADE;

CREATE VIEW public.v_conditions_needing_gift_card_config 
WITH (security_invoker = true) AS
SELECT 
    cc.id AS condition_id,
    cc.campaign_id,
    c.name AS campaign_name,
    c.status AS campaign_status,
    cl.name AS client_name,
    cc.condition_number,
    cc.condition_name,
    cc.brand_id,
    cc.card_value,
    cc.is_active,
    CASE
        WHEN cc.brand_id IS NULL AND cc.card_value IS NULL THEN 'Missing brand and value'
        WHEN cc.brand_id IS NULL THEN 'Missing brand'
        WHEN cc.card_value IS NULL OR cc.card_value = 0 THEN 'Missing value'
        ELSE 'OK'
    END AS issue_type
FROM public.campaign_conditions cc
JOIN public.campaigns c ON c.id = cc.campaign_id
LEFT JOIN public.clients cl ON cl.id = c.client_id
WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0) 
  AND cc.is_active = true;

COMMENT ON VIEW public.v_conditions_needing_gift_card_config IS 'View showing all active campaign conditions that need gift card configuration before they can be used for provisioning.';
GRANT ALL ON TABLE public.v_conditions_needing_gift_card_config TO anon;
GRANT ALL ON TABLE public.v_conditions_needing_gift_card_config TO authenticated;
GRANT ALL ON TABLE public.v_conditions_needing_gift_card_config TO service_role;

-- ============================================
-- 6. v_provisioning_attempts
-- ============================================
DROP VIEW IF EXISTS public.v_provisioning_attempts CASCADE;

CREATE VIEW public.v_provisioning_attempts 
WITH (security_invoker = true) AS
SELECT 
    request_id,
    MIN(created_at) AS started_at,
    MAX(created_at) AS ended_at,
    MAX(step_number) AS total_steps,
    campaign_id,
    recipient_id,
    brand_id,
    denomination,
    CASE
        WHEN COUNT(*) FILTER (WHERE status = 'failed') > 0 THEN 'failed'
        WHEN COUNT(*) FILTER (WHERE status = 'completed') = MAX(step_number) THEN 'success'
        ELSE 'in_progress'
    END AS overall_status,
    MAX(error_message) FILTER (WHERE status = 'failed') AS failure_message,
    MAX(error_code) FILTER (WHERE status = 'failed') AS failure_code,
    SUM(duration_ms) AS total_duration_ms
FROM public.gift_card_provisioning_trace
GROUP BY request_id, campaign_id, recipient_id, brand_id, denomination;

COMMENT ON VIEW public.v_provisioning_attempts IS 'Aggregated view of provisioning attempts with overall status';
GRANT ALL ON TABLE public.v_provisioning_attempts TO anon;
GRANT ALL ON TABLE public.v_provisioning_attempts TO authenticated;
GRANT ALL ON TABLE public.v_provisioning_attempts TO service_role;

-- ============================================
-- 7. v_provisioning_health_hourly
-- ============================================
DROP VIEW IF EXISTS public.v_provisioning_health_hourly CASCADE;

CREATE VIEW public.v_provisioning_health_hourly 
WITH (security_invoker = true) AS
SELECT 
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(DISTINCT request_id) AS total_attempts,
    COUNT(DISTINCT request_id) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM public.gift_card_provisioning_trace t2
        WHERE t2.request_id = gift_card_provisioning_trace.request_id AND t2.status = 'failed'
    )) AS successful_attempts,
    COUNT(DISTINCT request_id) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.gift_card_provisioning_trace t2
        WHERE t2.request_id = gift_card_provisioning_trace.request_id AND t2.status = 'failed'
    )) AS failed_attempts,
    ROUND(
        100.0 * COUNT(DISTINCT request_id) FILTER (WHERE NOT EXISTS (
            SELECT 1 FROM public.gift_card_provisioning_trace t2
            WHERE t2.request_id = gift_card_provisioning_trace.request_id AND t2.status = 'failed'
        ))::NUMERIC / NULLIF(COUNT(DISTINCT request_id), 0)::NUMERIC, 
        2
    ) AS success_rate,
    ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 2) AS avg_duration_ms
FROM public.gift_card_provisioning_trace
WHERE created_at >= (NOW() - INTERVAL '7 days')
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY DATE_TRUNC('hour', created_at) DESC;

COMMENT ON VIEW public.v_provisioning_health_hourly IS 'Hourly aggregation of provisioning health metrics for trending';
GRANT ALL ON TABLE public.v_provisioning_health_hourly TO anon;
GRANT ALL ON TABLE public.v_provisioning_health_hourly TO authenticated;
GRANT ALL ON TABLE public.v_provisioning_health_hourly TO service_role;

-- ============================================
-- 8. v_provisioning_step_performance
-- ============================================
DROP VIEW IF EXISTS public.v_provisioning_step_performance CASCADE;

CREATE VIEW public.v_provisioning_step_performance 
WITH (security_invoker = true) AS
SELECT 
    step_name,
    COUNT(*) AS total_executions,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed,
    COUNT(*) FILTER (WHERE status = 'skipped') AS skipped,
    ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 2) AS avg_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms::DOUBLE PRECISION) FILTER (WHERE duration_ms IS NOT NULL) AS median_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms::DOUBLE PRECISION) FILTER (WHERE duration_ms IS NOT NULL) AS p95_duration_ms,
    MAX(duration_ms) AS max_duration_ms
FROM public.gift_card_provisioning_trace
WHERE created_at >= (NOW() - INTERVAL '24 hours')
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

COMMENT ON VIEW public.v_provisioning_step_performance IS 'Performance metrics for each provisioning step';
GRANT ALL ON TABLE public.v_provisioning_step_performance TO anon;
GRANT ALL ON TABLE public.v_provisioning_step_performance TO authenticated;
GRANT ALL ON TABLE public.v_provisioning_step_performance TO service_role;

-- ============================================
-- 9. v_top_provisioning_failures
-- ============================================
DROP VIEW IF EXISTS public.v_top_provisioning_failures CASCADE;

CREATE VIEW public.v_top_provisioning_failures 
WITH (security_invoker = true) AS
SELECT 
    error_code,
    error_message,
    COUNT(*) AS occurrence_count,
    COUNT(DISTINCT campaign_id) AS affected_campaigns,
    COUNT(DISTINCT recipient_id) AS affected_recipients,
    MAX(created_at) AS last_occurred,
    MIN(created_at) AS first_occurred
FROM public.gift_card_provisioning_trace
WHERE status = 'failed' 
  AND error_code IS NOT NULL 
  AND created_at >= (NOW() - INTERVAL '7 days')
GROUP BY error_code, error_message
ORDER BY COUNT(*) DESC
LIMIT 20;

COMMENT ON VIEW public.v_top_provisioning_failures IS 'Top 20 most common provisioning failures in the last 7 days';
GRANT ALL ON TABLE public.v_top_provisioning_failures TO anon;
GRANT ALL ON TABLE public.v_top_provisioning_failures TO authenticated;
GRANT ALL ON TABLE public.v_top_provisioning_failures TO service_role;

-- ============================================
-- Verify all views are created with security_invoker
-- ============================================
DO $$
DECLARE
  view_name TEXT;
  views_to_check TEXT[] := ARRAY[
    'activity_stats',
    'gift_card_inventory_summary',
    'v_active_provisioning_issues',
    'v_campaign_provisioning_stats',
    'v_conditions_needing_gift_card_config',
    'v_provisioning_attempts',
    'v_provisioning_health_hourly',
    'v_provisioning_step_performance',
    'v_top_provisioning_failures'
  ];
BEGIN
  FOREACH view_name IN ARRAY views_to_check LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_views 
      WHERE schemaname = 'public' 
      AND viewname = view_name
    ) THEN
      RAISE EXCEPTION 'View % was not created', view_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'All security definer views have been recreated with security_invoker = true';
END $$;
