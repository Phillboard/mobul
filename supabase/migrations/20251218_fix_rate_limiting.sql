-- Fix Rate Limiting Migration
-- Repairs the rate_limit_log table after previous partial migration failure

-- Drop the problematic index if it exists (it shouldn't, but safety first)
DROP INDEX IF EXISTS idx_rate_limit_log_cleanup;

-- Create simple index for cleanup queries (without IMMUTABLE predicate issue)
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_created_at 
  ON rate_limit_log (created_at);

-- Recreate or replace the check_and_increment function (in case it wasn't created)
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_limit INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 60
) RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_oldest_in_window TIMESTAMPTZ;
  v_retry_after INTEGER;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Count requests in window
  SELECT COUNT(*), MIN(created_at) INTO v_count, v_oldest_in_window
  FROM rate_limit_log
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at >= v_window_start;
  
  -- If under limit, log this request
  IF v_count < p_limit THEN
    INSERT INTO rate_limit_log (identifier, endpoint, created_at)
    VALUES (p_identifier, p_endpoint, NOW());
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_limit - v_count - 1,
      'retry_after', 0
    );
  END IF;
  
  -- Calculate retry_after based on oldest entry in window
  IF v_oldest_in_window IS NOT NULL THEN
    v_retry_after := GREATEST(
      1,
      EXTRACT(EPOCH FROM (v_oldest_in_window + (p_window_seconds || ' seconds')::INTERVAL - NOW()))::INTEGER
    );
  ELSE
    v_retry_after := p_window_seconds;
  END IF;
  
  -- Over limit
  RETURN jsonb_build_object(
    'allowed', false,
    'remaining', 0,
    'retry_after', v_retry_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION check_and_increment_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_and_increment_rate_limit TO service_role;

-- Cleanup function to remove old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limit_log() RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_log
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
REVOKE ALL ON FUNCTION cleanup_rate_limit_log FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_log TO service_role;

-- Ensure RLS is enabled
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE rate_limit_log IS 'Stores rate limit request logs for API endpoints';
COMMENT ON FUNCTION check_and_increment_rate_limit IS 'Atomically checks and increments rate limit counter. Returns {allowed: bool, remaining: int, retry_after: int}';
