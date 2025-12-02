-- =====================================================
-- Rate Limiting System Migration
-- =====================================================
-- Creates tables and functions for API rate limiting
-- Prevents abuse of public endpoints
-- =====================================================

-- Rate limit log table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address, API key, or user_id
  endpoint TEXT NOT NULL, -- Which function/endpoint was called
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  request_method TEXT,
  request_path TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_time 
  ON rate_limit_log(identifier, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint_time 
  ON rate_limit_log(endpoint, created_at DESC);

-- Simple index for cleanup queries (without predicate)
CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup 
  ON rate_limit_log(created_at);

-- Enable RLS
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (edge functions)
DROP POLICY IF EXISTS "Service role can insert rate limit logs" ON rate_limit_log;
CREATE POLICY "Service role can insert rate limit logs"
  ON rate_limit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Admins can view rate limit logs
DROP POLICY IF EXISTS "Admins can view rate limit logs" ON rate_limit_log;
CREATE POLICY "Admins can view rate limit logs"
  ON rate_limit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_limit INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count BIGINT,
  limit_value INTEGER,
  retry_after INTEGER
) AS $$
DECLARE
  v_count BIGINT;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Count requests in current window
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at >= v_window_start;
  
  -- Return result
  RETURN QUERY
  SELECT 
    (v_count < p_limit) as allowed,
    v_count as current_count,
    p_limit as limit_value,
    p_window_seconds as retry_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log rate limit request
CREATE OR REPLACE FUNCTION log_rate_limit_request(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_request_method TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO rate_limit_log (
    identifier,
    endpoint,
    user_agent,
    request_method,
    request_path,
    metadata
  ) VALUES (
    p_identifier,
    p_endpoint,
    p_user_agent,
    p_request_method,
    p_request_path,
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old rate limit logs (run daily)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limit_log 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate limit stats
CREATE OR REPLACE FUNCTION get_rate_limit_stats(
  p_time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  endpoint TEXT,
  total_requests BIGINT,
  unique_identifiers BIGINT,
  top_identifier TEXT,
  top_identifier_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rll.endpoint,
    COUNT(*) as total_requests,
    COUNT(DISTINCT rll.identifier) as unique_identifiers,
    (
      SELECT identifier 
      FROM rate_limit_log 
      WHERE endpoint = rll.endpoint 
        AND created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
      GROUP BY identifier 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as top_identifier,
    (
      SELECT COUNT(*) 
      FROM rate_limit_log 
      WHERE endpoint = rll.endpoint 
        AND identifier = (
          SELECT identifier 
          FROM rate_limit_log 
          WHERE endpoint = rll.endpoint 
            AND created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
          GROUP BY identifier 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        )
        AND created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
    ) as top_identifier_count
  FROM rate_limit_log rll
  WHERE rll.created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
  GROUP BY rll.endpoint
  ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION log_rate_limit_request TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_logs TO service_role;
GRANT EXECUTE ON FUNCTION get_rate_limit_stats TO authenticated;

-- Comments
COMMENT ON TABLE rate_limit_log IS 'Log of API requests for rate limiting and abuse prevention';
COMMENT ON FUNCTION check_rate_limit IS 'Check if identifier has exceeded rate limit for endpoint';
COMMENT ON FUNCTION log_rate_limit_request IS 'Log an API request for rate limiting purposes';
COMMENT ON FUNCTION cleanup_rate_limit_logs IS 'Remove rate limit logs older than 24 hours';
COMMENT ON FUNCTION get_rate_limit_stats IS 'Get rate limiting statistics for monitoring';


