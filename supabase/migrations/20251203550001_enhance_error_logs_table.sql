-- Enhance error_logs table for comprehensive error tracking
-- Created: December 3, 2025
-- Purpose: Add additional columns for better error tracking

-- Add new columns to existing error_logs table
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS error_type text;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS error_stack text;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS timestamp timestamptz DEFAULT now();
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES recipients(id) ON DELETE SET NULL;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS request_id text;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS notes text;

-- Ensure severity column accepts new values
ALTER TABLE error_logs DROP CONSTRAINT IF EXISTS error_logs_severity_check;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_organization_id ON error_logs(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_recipient_id ON error_logs(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_campaign_id ON error_logs(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_request_id ON error_logs(request_id) WHERE request_id IS NOT NULL;

-- Full text search index for error messages
CREATE INDEX IF NOT EXISTS idx_error_logs_error_message_search ON error_logs USING gin(to_tsvector('english', error_message)) WHERE error_message IS NOT NULL;

-- Update existing RLS policies to use both old and new columns
DROP POLICY IF EXISTS "Platform admins can insert error logs" ON error_logs;
CREATE POLICY "Platform admins can insert error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to error logs" ON error_logs;
CREATE POLICY "Service role has full access to error logs"
  ON error_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous error logging" ON error_logs;
CREATE POLICY "Allow anonymous error logging"
  ON error_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create or replace function to log errors with new schema
CREATE OR REPLACE FUNCTION log_error(
  p_error_type text,
  p_severity text,
  p_source text,
  p_error_message text,
  p_error_stack text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_recipient_id uuid DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_request_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO error_logs (
    error_type,
    severity,
    source,
    error_message,
    error_stack,
    user_id,
    recipient_id,
    campaign_id,
    organization_id,
    metadata,
    request_id,
    timestamp
  ) VALUES (
    p_error_type,
    CASE p_severity 
      WHEN 'info' THEN 'low'
      WHEN 'warning' THEN 'medium'
      WHEN 'error' THEN 'high'
      WHEN 'critical' THEN 'critical'
      ELSE p_severity
    END,
    p_source,
    p_error_message,
    p_error_stack,
    p_user_id,
    p_recipient_id,
    p_campaign_id,
    p_organization_id,
    p_metadata,
    p_request_id,
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_error TO authenticated;
GRANT EXECUTE ON FUNCTION log_error TO anon;
GRANT EXECUTE ON FUNCTION log_error TO service_role;

-- Create function to get error statistics with new schema
CREATE OR REPLACE FUNCTION get_error_stats(
  p_hours integer DEFAULT 24
)
RETURNS TABLE (
  total_errors bigint,
  critical_count bigint,
  error_count bigint,
  warning_count bigint,
  info_count bigint,
  unresolved_count bigint,
  top_sources jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE severity IN ('critical')) as critical,
      COUNT(*) FILTER (WHERE severity IN ('high', 'error')) as errors,
      COUNT(*) FILTER (WHERE severity IN ('medium', 'warning')) as warnings,
      COUNT(*) FILTER (WHERE severity IN ('low', 'info')) as info,
      COUNT(*) FILTER (WHERE resolved = false) as unresolved
    FROM error_logs
    WHERE COALESCE(timestamp, created_at) > now() - (p_hours || ' hours')::interval
  ),
  top_src AS (
    SELECT jsonb_agg(
      jsonb_build_object('source', src, 'count', cnt)
      ORDER BY cnt DESC
    ) as sources
    FROM (
      SELECT COALESCE(source, 'unknown') as src, COUNT(*) as cnt
      FROM error_logs
      WHERE COALESCE(timestamp, created_at) > now() - (p_hours || ' hours')::interval
      GROUP BY COALESCE(source, 'unknown')
      ORDER BY cnt DESC
      LIMIT 10
    ) s
  )
  SELECT
    stats.total,
    stats.critical,
    stats.errors,
    stats.warnings,
    stats.info,
    stats.unresolved,
    COALESCE(top_src.sources, '[]'::jsonb)
  FROM stats, top_src;
END;
$$;

GRANT EXECUTE ON FUNCTION get_error_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_error_stats TO service_role;

