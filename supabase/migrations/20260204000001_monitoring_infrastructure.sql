-- ============================================================================
-- Monitoring Infrastructure Migration
-- ============================================================================
-- Adds retention management, aggregation tables, and archival functions
-- for enterprise-grade monitoring with compliance-driven retention.
--
-- Retention Classes:
--   - operational: 90 days hot storage, then archived
--   - audit: 7 years full retention (compliance)
-- ============================================================================

-- ============================================================================
-- 1. Add retention and archival columns to activity_log
-- ============================================================================

-- Add retention classification column
ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS retention_class TEXT DEFAULT 'operational';

-- Add constraint after adding column (avoids issues if column exists)
DO $$ 
BEGIN
  ALTER TABLE public.activity_log 
  ADD CONSTRAINT activity_log_retention_class_check 
  CHECK (retention_class IN ('operational', 'audit'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add archival tracking columns
ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archive_batch_id UUID;

-- Add billing category to the constraint
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_category_check;
ALTER TABLE public.activity_log 
ADD CONSTRAINT activity_log_category_check 
CHECK (category IN ('gift_card', 'campaign', 'communication', 'api', 'user', 'system', 'billing'));

-- Index for retention-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_retention_created 
ON public.activity_log (retention_class, created_at) 
WHERE archived_at IS NULL;

-- Index for archival cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_archived 
ON public.activity_log (archived_at) 
WHERE archived_at IS NOT NULL;

-- Index for organization-scoped queries (dashboard performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_org_created 
ON public.activity_log (organization_id, created_at DESC) 
WHERE organization_id IS NOT NULL;

COMMENT ON COLUMN public.activity_log.retention_class IS 'Retention policy: operational (90 days) or audit (7 years)';
COMMENT ON COLUMN public.activity_log.archived_at IS 'Timestamp when record was archived to cold storage';
COMMENT ON COLUMN public.activity_log.archive_batch_id IS 'Batch ID for archive operations (for rollback/tracking)';

-- ============================================================================
-- 2. Add retention columns to other high-volume logging tables
-- ============================================================================

-- error_logs
ALTER TABLE public.error_logs 
ADD COLUMN IF NOT EXISTS retention_class TEXT DEFAULT 'operational',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$ 
BEGIN
  ALTER TABLE public.error_logs 
  ADD CONSTRAINT error_logs_retention_class_check 
  CHECK (retention_class IN ('operational', 'audit'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- sms_delivery_log  
ALTER TABLE public.sms_delivery_log 
ADD COLUMN IF NOT EXISTS retention_class TEXT DEFAULT 'audit',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$ 
BEGIN
  ALTER TABLE public.sms_delivery_log 
  ADD CONSTRAINT sms_delivery_log_retention_class_check 
  CHECK (retention_class IN ('operational', 'audit'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- email_delivery_logs
ALTER TABLE public.email_delivery_logs 
ADD COLUMN IF NOT EXISTS retention_class TEXT DEFAULT 'audit',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$ 
BEGIN
  ALTER TABLE public.email_delivery_logs 
  ADD CONSTRAINT email_delivery_logs_retention_class_check 
  CHECK (retention_class IN ('operational', 'audit'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- recipient_audit_log (always audit)
ALTER TABLE public.recipient_audit_log 
ADD COLUMN IF NOT EXISTS retention_class TEXT DEFAULT 'audit',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- security_audit_log (always audit)
ALTER TABLE public.security_audit_log 
ADD COLUMN IF NOT EXISTS retention_class TEXT DEFAULT 'audit',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- performance_metrics (operational)
ALTER TABLE public.performance_metrics 
ADD COLUMN IF NOT EXISTS retention_class TEXT DEFAULT 'operational',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================================================
-- 3. Create aggregation tables for dashboard performance
-- ============================================================================

-- Hourly stats (kept 90 days)
CREATE TABLE IF NOT EXISTS public.monitoring_stats_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID,
  hour_start TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL,
  event_type TEXT,
  
  -- Counters
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Metrics
  avg_duration_ms NUMERIC,
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,
  total_value_cents BIGINT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT monitoring_stats_hourly_unique 
  UNIQUE (organization_id, client_id, hour_start, category, event_type)
);

COMMENT ON TABLE public.monitoring_stats_hourly IS 'Hourly aggregated activity stats for fast dashboard queries. Retained 90 days.';

-- Daily stats (kept 2 years)
CREATE TABLE IF NOT EXISTS public.monitoring_stats_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID,
  day_start DATE NOT NULL,
  category TEXT NOT NULL,
  event_type TEXT,
  
  -- Counters
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Metrics
  avg_duration_ms NUMERIC,
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,
  total_value_cents BIGINT DEFAULT 0,
  
  -- Unique users/resources
  unique_users INTEGER DEFAULT 0,
  unique_campaigns INTEGER DEFAULT 0,
  unique_recipients INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT monitoring_stats_daily_unique 
  UNIQUE (organization_id, client_id, day_start, category, event_type)
);

COMMENT ON TABLE public.monitoring_stats_daily IS 'Daily aggregated activity stats. Retained 2 years.';

-- Monthly stats (kept forever)
CREATE TABLE IF NOT EXISTS public.monitoring_stats_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID,
  month_start DATE NOT NULL,
  category TEXT NOT NULL,
  
  -- Counters
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Financial metrics
  total_value_cents BIGINT DEFAULT 0,
  total_credits_used BIGINT DEFAULT 0,
  
  -- Resource counts
  unique_users INTEGER DEFAULT 0,
  unique_campaigns INTEGER DEFAULT 0,
  unique_recipients INTEGER DEFAULT 0,
  gift_cards_provisioned INTEGER DEFAULT 0,
  gift_cards_redeemed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT monitoring_stats_monthly_unique 
  UNIQUE (organization_id, client_id, month_start, category)
);

COMMENT ON TABLE public.monitoring_stats_monthly IS 'Monthly aggregated stats for historical reporting. Retained indefinitely.';

-- Indexes for aggregation tables
CREATE INDEX IF NOT EXISTS idx_stats_hourly_org_time 
ON public.monitoring_stats_hourly (organization_id, hour_start DESC);

CREATE INDEX IF NOT EXISTS idx_stats_hourly_client_time 
ON public.monitoring_stats_hourly (client_id, hour_start DESC) 
WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stats_daily_org_time 
ON public.monitoring_stats_daily (organization_id, day_start DESC);

CREATE INDEX IF NOT EXISTS idx_stats_daily_client_time 
ON public.monitoring_stats_daily (client_id, day_start DESC) 
WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stats_monthly_org_time 
ON public.monitoring_stats_monthly (organization_id, month_start DESC);

-- ============================================================================
-- 4. RLS for aggregation tables
-- ============================================================================

ALTER TABLE public.monitoring_stats_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_stats_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_stats_monthly ENABLE ROW LEVEL SECURITY;

-- Admins can see all stats
CREATE POLICY "Admins can view all hourly stats"
ON public.monitoring_stats_hourly FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Agency owners see their org stats
CREATE POLICY "Agency owners can view org hourly stats"
ON public.monitoring_stats_hourly FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.org_members om ON om.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'agency_owner'
    AND monitoring_stats_hourly.organization_id = om.org_id
  )
);

-- Client users see their client stats
CREATE POLICY "Client users can view client hourly stats"
ON public.monitoring_stats_hourly FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.user_id = auth.uid() 
    AND monitoring_stats_hourly.client_id = cu.client_id
  )
);

-- Service role can insert/update
CREATE POLICY "Service role can manage hourly stats"
ON public.monitoring_stats_hourly FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Repeat for daily stats
CREATE POLICY "Admins can view all daily stats"
ON public.monitoring_stats_daily FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Agency owners can view org daily stats"
ON public.monitoring_stats_daily FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.org_members om ON om.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'agency_owner'
    AND monitoring_stats_daily.organization_id = om.org_id
  )
);

CREATE POLICY "Client users can view client daily stats"
ON public.monitoring_stats_daily FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.user_id = auth.uid() 
    AND monitoring_stats_daily.client_id = cu.client_id
  )
);

CREATE POLICY "Service role can manage daily stats"
ON public.monitoring_stats_daily FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Repeat for monthly stats
CREATE POLICY "Admins can view all monthly stats"
ON public.monitoring_stats_monthly FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Agency owners can view org monthly stats"
ON public.monitoring_stats_monthly FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.org_members om ON om.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'agency_owner'
    AND monitoring_stats_monthly.organization_id = om.org_id
  )
);

CREATE POLICY "Client users can view client monthly stats"
ON public.monitoring_stats_monthly FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.user_id = auth.uid() 
    AND monitoring_stats_monthly.client_id = cu.client_id
  )
);

CREATE POLICY "Service role can manage monthly stats"
ON public.monitoring_stats_monthly FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. Aggregation functions
-- ============================================================================

-- Aggregate hourly stats from raw activity_log
CREATE OR REPLACE FUNCTION public.aggregate_hourly_stats(
  p_hour TIMESTAMPTZ DEFAULT date_trunc('hour', now() - INTERVAL '1 hour')
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.monitoring_stats_hourly (
    organization_id, client_id, hour_start, category, event_type,
    total_count, success_count, failed_count, warning_count, error_count,
    avg_duration_ms
  )
  SELECT 
    COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID) as organization_id,
    client_id,
    date_trunc('hour', created_at) as hour_start,
    category,
    event_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'success') as success_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE severity = 'warning') as warning_count,
    COUNT(*) FILTER (WHERE severity IN ('error', 'critical')) as error_count,
    AVG((metadata->>'duration_ms')::NUMERIC) FILTER (WHERE metadata->>'duration_ms' IS NOT NULL) as avg_duration_ms
  FROM public.activity_log
  WHERE created_at >= p_hour 
    AND created_at < p_hour + INTERVAL '1 hour'
    AND archived_at IS NULL
  GROUP BY 
    COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID),
    client_id, 
    date_trunc('hour', created_at), 
    category, 
    event_type
  ON CONFLICT (organization_id, client_id, hour_start, category, event_type)
  DO UPDATE SET
    total_count = EXCLUDED.total_count,
    success_count = EXCLUDED.success_count,
    failed_count = EXCLUDED.failed_count,
    warning_count = EXCLUDED.warning_count,
    error_count = EXCLUDED.error_count,
    avg_duration_ms = EXCLUDED.avg_duration_ms,
    updated_at = NOW();
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.aggregate_hourly_stats IS 'Aggregates activity_log into hourly stats. Run hourly via cron.';

-- Aggregate daily stats from hourly stats
CREATE OR REPLACE FUNCTION public.aggregate_daily_stats(
  p_date DATE DEFAULT (CURRENT_DATE - 1)
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.monitoring_stats_daily (
    organization_id, client_id, day_start, category, event_type,
    total_count, success_count, failed_count, warning_count, error_count,
    avg_duration_ms, min_duration_ms, max_duration_ms
  )
  SELECT 
    organization_id,
    client_id,
    p_date as day_start,
    category,
    event_type,
    SUM(total_count) as total_count,
    SUM(success_count) as success_count,
    SUM(failed_count) as failed_count,
    SUM(warning_count) as warning_count,
    SUM(error_count) as error_count,
    AVG(avg_duration_ms) as avg_duration_ms,
    MIN(min_duration_ms) as min_duration_ms,
    MAX(max_duration_ms) as max_duration_ms
  FROM public.monitoring_stats_hourly
  WHERE hour_start >= p_date::TIMESTAMPTZ 
    AND hour_start < (p_date + 1)::TIMESTAMPTZ
  GROUP BY organization_id, client_id, category, event_type
  ON CONFLICT (organization_id, client_id, day_start, category, event_type)
  DO UPDATE SET
    total_count = EXCLUDED.total_count,
    success_count = EXCLUDED.success_count,
    failed_count = EXCLUDED.failed_count,
    warning_count = EXCLUDED.warning_count,
    error_count = EXCLUDED.error_count,
    avg_duration_ms = EXCLUDED.avg_duration_ms,
    min_duration_ms = EXCLUDED.min_duration_ms,
    max_duration_ms = EXCLUDED.max_duration_ms,
    updated_at = NOW();
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.aggregate_daily_stats IS 'Aggregates hourly stats into daily stats. Run daily via cron.';

-- ============================================================================
-- 6. Archival functions
-- ============================================================================

-- Archive old operational logs
CREATE OR REPLACE FUNCTION public.archive_old_activity_logs(
  p_retention_days INTEGER DEFAULT 90,
  p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived INTEGER := 0;
  v_deleted INTEGER := 0;
  v_batch_id UUID := gen_random_uuid();
  v_cutoff TIMESTAMPTZ := NOW() - (p_retention_days || ' days')::INTERVAL;
BEGIN
  -- Mark records for archival
  UPDATE public.activity_log 
  SET 
    archived_at = NOW(), 
    archive_batch_id = v_batch_id
  WHERE id IN (
    SELECT id FROM public.activity_log
    WHERE retention_class = 'operational'
      AND created_at < v_cutoff
      AND archived_at IS NULL
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  );
  
  GET DIAGNOSTICS v_archived = ROW_COUNT;
  
  -- Delete records that were archived more than 7 days ago (safety buffer)
  DELETE FROM public.activity_log 
  WHERE archived_at IS NOT NULL 
    AND archived_at < NOW() - INTERVAL '7 days'
    AND retention_class = 'operational';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT v_archived, v_deleted;
END;
$$;

COMMENT ON FUNCTION public.archive_old_activity_logs IS 'Archives operational logs older than retention period. Returns counts of archived and deleted records.';

-- Cleanup old hourly stats (keep 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_hourly_stats(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_cutoff TIMESTAMPTZ := NOW() - (p_retention_days || ' days')::INTERVAL;
BEGIN
  DELETE FROM public.monitoring_stats_hourly
  WHERE hour_start < v_cutoff;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_hourly_stats IS 'Removes hourly stats older than retention period.';

-- ============================================================================
-- 7. Query helpers for org-scoped stats
-- ============================================================================

-- Get activity stats for an organization (for dashboards)
CREATE OR REPLACE FUNCTION public.get_org_activity_stats(
  p_org_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_period TEXT DEFAULT 'daily',  -- hourly, daily, monthly
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  period_start TIMESTAMPTZ,
  category TEXT,
  total_count BIGINT,
  success_count BIGINT,
  failed_count BIGINT,
  error_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_period = 'hourly' THEN
    RETURN QUERY
    SELECT 
      h.hour_start as period_start,
      h.category,
      SUM(h.total_count)::BIGINT as total_count,
      SUM(h.success_count)::BIGINT as success_count,
      SUM(h.failed_count)::BIGINT as failed_count,
      SUM(h.error_count)::BIGINT as error_count
    FROM public.monitoring_stats_hourly h
    WHERE h.organization_id = p_org_id
      AND (p_client_id IS NULL OR h.client_id = p_client_id)
      AND h.hour_start >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY h.hour_start, h.category
    ORDER BY h.hour_start DESC;
    
  ELSIF p_period = 'daily' THEN
    RETURN QUERY
    SELECT 
      d.day_start::TIMESTAMPTZ as period_start,
      d.category,
      SUM(d.total_count)::BIGINT as total_count,
      SUM(d.success_count)::BIGINT as success_count,
      SUM(d.failed_count)::BIGINT as failed_count,
      SUM(d.error_count)::BIGINT as error_count
    FROM public.monitoring_stats_daily d
    WHERE d.organization_id = p_org_id
      AND (p_client_id IS NULL OR d.client_id = p_client_id)
      AND d.day_start >= (CURRENT_DATE - p_days)
    GROUP BY d.day_start, d.category
    ORDER BY d.day_start DESC;
    
  ELSE -- monthly
    RETURN QUERY
    SELECT 
      m.month_start::TIMESTAMPTZ as period_start,
      m.category,
      SUM(m.total_count)::BIGINT as total_count,
      SUM(m.success_count)::BIGINT as success_count,
      SUM(m.failed_count)::BIGINT as failed_count,
      0::BIGINT as error_count
    FROM public.monitoring_stats_monthly m
    WHERE m.organization_id = p_org_id
      AND (p_client_id IS NULL OR m.client_id = p_client_id)
      AND m.month_start >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)::DATE
    GROUP BY m.month_start, m.category
    ORDER BY m.month_start DESC;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_org_activity_stats IS 'Get aggregated activity stats for an organization. Used by dashboards.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.aggregate_hourly_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.aggregate_daily_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_old_activity_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_hourly_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.get_org_activity_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_activity_stats TO service_role;

-- Grant table access
GRANT SELECT ON public.monitoring_stats_hourly TO authenticated;
GRANT SELECT ON public.monitoring_stats_daily TO authenticated;
GRANT SELECT ON public.monitoring_stats_monthly TO authenticated;
GRANT ALL ON public.monitoring_stats_hourly TO service_role;
GRANT ALL ON public.monitoring_stats_daily TO service_role;
GRANT ALL ON public.monitoring_stats_monthly TO service_role;
