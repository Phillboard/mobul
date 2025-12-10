-- =====================================================
-- Migration: Gift Card Provisioning Trace Logging
-- =====================================================
-- Creates comprehensive trace logging for gift card provisioning
-- to diagnose failures at every step of the process.
-- =====================================================

-- =====================================================
-- 1. Create Provisioning Trace Table
-- =====================================================

CREATE TABLE IF NOT EXISTS gift_card_provisioning_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request identification
  request_id TEXT NOT NULL,
  
  -- Context
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES gift_card_brands(id) ON DELETE SET NULL,
  denomination NUMERIC,
  
  -- Step information
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  
  -- Performance
  duration_ms INTEGER,
  
  -- Details
  details JSONB DEFAULT '{}',
  error_message TEXT,
  error_code TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_provisioning_trace_request_id 
  ON gift_card_provisioning_trace(request_id);

CREATE INDEX IF NOT EXISTS idx_provisioning_trace_campaign_id 
  ON gift_card_provisioning_trace(campaign_id) 
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provisioning_trace_recipient_id 
  ON gift_card_provisioning_trace(recipient_id) 
  WHERE recipient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provisioning_trace_created_at 
  ON gift_card_provisioning_trace(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provisioning_trace_status_created 
  ON gift_card_provisioning_trace(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provisioning_trace_failed 
  ON gift_card_provisioning_trace(created_at DESC) 
  WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_provisioning_trace_error_code 
  ON gift_card_provisioning_trace(error_code, created_at DESC) 
  WHERE error_code IS NOT NULL;

-- =====================================================
-- 3. Enable RLS
-- =====================================================

ALTER TABLE gift_card_provisioning_trace ENABLE ROW LEVEL SECURITY;

-- Service role (edge functions) can insert
DROP POLICY IF EXISTS "Service role can insert provisioning trace" ON gift_card_provisioning_trace;
CREATE POLICY "Service role can insert provisioning trace" 
  ON gift_card_provisioning_trace FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Admins can view all traces
DROP POLICY IF EXISTS "Admins can view all provisioning traces" ON gift_card_provisioning_trace;
CREATE POLICY "Admins can view all provisioning traces"
  ON gift_card_provisioning_trace FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'tech_support')
    )
  );

-- Call center can view their traces
DROP POLICY IF EXISTS "Call center can view provisioning traces" ON gift_card_provisioning_trace;
CREATE POLICY "Call center can view provisioning traces"
  ON gift_card_provisioning_trace FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('call_center', 'company_owner', 'agency_owner')
    )
  );

-- =====================================================
-- 4. Create Summary View
-- =====================================================

CREATE OR REPLACE VIEW v_provisioning_attempts AS
SELECT 
  request_id,
  MIN(created_at) as started_at,
  MAX(created_at) as ended_at,
  MAX(step_number) as total_steps,
  campaign_id,
  recipient_id,
  brand_id,
  denomination,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'failed') > 0 THEN 'failed'
    WHEN COUNT(*) FILTER (WHERE status = 'completed') = MAX(step_number) THEN 'success'
    ELSE 'in_progress'
  END as overall_status,
  MAX(error_message) FILTER (WHERE status = 'failed') as failure_message,
  MAX(error_code) FILTER (WHERE status = 'failed') as failure_code,
  SUM(duration_ms) as total_duration_ms
FROM gift_card_provisioning_trace
GROUP BY request_id, campaign_id, recipient_id, brand_id, denomination;

COMMENT ON VIEW v_provisioning_attempts IS 'Aggregated view of provisioning attempts with overall status';

-- =====================================================
-- 5. Create Helper Functions
-- =====================================================

-- Function to get full trace for a request
CREATE OR REPLACE FUNCTION get_provisioning_trace(p_request_id TEXT)
RETURNS TABLE (
  step_number INTEGER,
  step_name TEXT,
  status TEXT,
  duration_ms INTEGER,
  details JSONB,
  error_message TEXT,
  error_code TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.step_number,
    t.step_name,
    t.status,
    t.duration_ms,
    t.details,
    t.error_message,
    t.error_code,
    t.created_at
  FROM gift_card_provisioning_trace t
  WHERE t.request_id = p_request_id
  ORDER BY t.step_number, t.created_at;
END;
$$;

COMMENT ON FUNCTION get_provisioning_trace IS 'Get full step-by-step trace for a provisioning request';

-- Function to get recent failures
CREATE OR REPLACE FUNCTION get_recent_provisioning_failures(
  p_limit INTEGER DEFAULT 50,
  p_campaign_id UUID DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  request_id TEXT,
  campaign_id UUID,
  recipient_id UUID,
  brand_id UUID,
  denomination NUMERIC,
  failure_step INTEGER,
  failure_step_name TEXT,
  error_message TEXT,
  error_code TEXT,
  failed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (t.request_id)
    t.request_id,
    t.campaign_id,
    t.recipient_id,
    t.brand_id,
    t.denomination,
    t.step_number as failure_step,
    t.step_name as failure_step_name,
    t.error_message,
    t.error_code,
    t.created_at as failed_at
  FROM gift_card_provisioning_trace t
  WHERE t.status = 'failed'
    AND t.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    AND (p_campaign_id IS NULL OR t.campaign_id = p_campaign_id)
  ORDER BY t.request_id, t.step_number DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_recent_provisioning_failures IS 'Get recent provisioning failures with error details';

-- Function to get error code statistics
CREATE OR REPLACE FUNCTION get_provisioning_error_stats(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  error_code TEXT,
  occurrence_count BIGINT,
  last_occurred TIMESTAMPTZ,
  affected_campaigns BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.error_code,
    COUNT(*) as occurrence_count,
    MAX(t.created_at) as last_occurred,
    COUNT(DISTINCT t.campaign_id) as affected_campaigns
  FROM gift_card_provisioning_trace t
  WHERE t.status = 'failed'
    AND t.error_code IS NOT NULL
    AND t.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY t.error_code
  ORDER BY occurrence_count DESC;
END;
$$;

COMMENT ON FUNCTION get_provisioning_error_stats IS 'Get error code statistics for monitoring';

-- Function to get provisioning health metrics
CREATE OR REPLACE FUNCTION get_provisioning_health(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_attempts BIGINT,
  successful_attempts BIGINT,
  failed_attempts BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  top_error_code TEXT,
  top_error_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH attempt_stats AS (
    SELECT 
      request_id,
      MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed,
      SUM(duration_ms) as total_duration
    FROM gift_card_provisioning_trace
    WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY request_id
  ),
  error_stats AS (
    SELECT 
      error_code,
      COUNT(*) as error_count
    FROM gift_card_provisioning_trace
    WHERE status = 'failed'
      AND error_code IS NOT NULL
      AND created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY error_code
    ORDER BY error_count DESC
    LIMIT 1
  )
  SELECT 
    COUNT(*)::BIGINT as total_attempts,
    COUNT(*) FILTER (WHERE is_failed = 0)::BIGINT as successful_attempts,
    COUNT(*) FILTER (WHERE is_failed = 1)::BIGINT as failed_attempts,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE is_failed = 0) / NULLIF(COUNT(*), 0),
      2
    ) as success_rate,
    ROUND(AVG(total_duration), 2) as avg_duration_ms,
    (SELECT error_code FROM error_stats) as top_error_code,
    (SELECT error_count FROM error_stats) as top_error_count
  FROM attempt_stats;
END;
$$;

COMMENT ON FUNCTION get_provisioning_health IS 'Get overall provisioning health metrics';

-- =====================================================
-- 6. Grant Permissions
-- =====================================================

GRANT SELECT ON gift_card_provisioning_trace TO authenticated;
GRANT SELECT ON v_provisioning_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION get_provisioning_trace(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_provisioning_failures(INTEGER, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provisioning_error_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provisioning_health(INTEGER) TO authenticated;

-- =====================================================
-- 7. Add error_code column to error_logs if missing
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'error_logs' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE error_logs ADD COLUMN error_code TEXT;
    CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code) WHERE error_code IS NOT NULL;
  END IF;
END $$;

-- =====================================================
-- 8. Create cleanup function for old traces
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_provisioning_traces(
  p_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM gift_card_provisioning_trace
  WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_provisioning_traces IS 'Clean up provisioning traces older than specified days';

-- =====================================================
-- 9. Log completion
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Gift card provisioning trace logging migration completed successfully';
END $$;

