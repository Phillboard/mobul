-- Create error tracking tables for centralized error logging

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL CHECK (category IN (
    'gift_card', 'campaign', 'contact', 'form', 'auth', 
    'call_center', 'api', 'database', 'external_service', 'unknown'
  )),
  message TEXT NOT NULL,
  error_details JSONB,
  context JSONB DEFAULT '{}',
  stack_trace TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_error_logs_severity_occurred ON error_logs(severity, occurred_at DESC);
CREATE INDEX idx_error_logs_category_occurred ON error_logs(category, occurred_at DESC);
CREATE INDEX idx_error_logs_client_occurred ON error_logs(client_id, occurred_at DESC) WHERE client_id IS NOT NULL;
CREATE INDEX idx_error_logs_user_occurred ON error_logs(user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_error_logs_unresolved ON error_logs(occurred_at DESC) WHERE resolved = FALSE;

CREATE INDEX idx_system_alerts_unread ON system_alerts(created_at DESC) WHERE is_read = FALSE;
CREATE INDEX idx_system_alerts_undismissed ON system_alerts(created_at DESC) WHERE dismissed = FALSE;
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity, created_at DESC);

-- RLS Policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can see all errors
CREATE POLICY "Admins can view all error logs"
  ON error_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can see errors for their own actions
CREATE POLICY "Users can view their own error logs"
  ON error_logs FOR SELECT
  USING (user_id = auth.uid());

-- Users can see errors for their client
CREATE POLICY "Users can view client error logs"
  ON error_logs FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM client_users WHERE user_id = auth.uid()
    )
  );

-- Service role can insert errors
CREATE POLICY "Service role can insert error logs"
  ON error_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Admins can update/resolve errors
CREATE POLICY "Admins can update error logs"
  ON error_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- System alerts policies
CREATE POLICY "Admins can view all alerts"
  ON system_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can insert alerts"
  ON system_alerts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can mark alerts as read"
  ON system_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'agency_owner')
    )
  );

-- Function to get error rate for monitoring
CREATE OR REPLACE FUNCTION get_error_rate(
  p_time_window_minutes INTEGER DEFAULT 60,
  p_severity TEXT DEFAULT NULL
)
RETURNS TABLE (
  error_count BIGINT,
  errors_per_minute NUMERIC,
  top_categories JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH error_stats AS (
    SELECT 
      COUNT(*) as total_errors,
      COUNT(*)::NUMERIC / p_time_window_minutes as rate,
      jsonb_object_agg(category, cat_count) as categories
    FROM (
      SELECT 
        category,
        COUNT(*) as cat_count
      FROM error_logs
      WHERE occurred_at >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
        AND (p_severity IS NULL OR severity = p_severity)
      GROUP BY category
    ) cat_counts
  )
  SELECT 
    total_errors,
    rate,
    categories
  FROM error_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get critical errors needing attention
CREATE OR REPLACE FUNCTION get_critical_errors_needing_attention()
RETURNS TABLE (
  id UUID,
  message TEXT,
  category TEXT,
  occurred_at TIMESTAMPTZ,
  context JSONB,
  user_id UUID,
  client_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.message,
    el.category,
    el.occurred_at,
    el.context,
    el.user_id,
    el.client_id
  FROM error_logs el
  WHERE el.severity = 'critical'
    AND el.resolved = FALSE
    AND el.occurred_at >= NOW() - INTERVAL '7 days'
  ORDER BY el.occurred_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_error_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_critical_errors_needing_attention TO authenticated;

-- Comments
COMMENT ON TABLE error_logs IS 'Centralized error logging for system-wide error tracking and monitoring';
COMMENT ON TABLE system_alerts IS 'System-level alerts for admins (inventory, errors, etc)';
COMMENT ON FUNCTION get_error_rate IS 'Calculate error rate over time window for monitoring dashboards';
COMMENT ON FUNCTION get_critical_errors_needing_attention IS 'Get unresolved critical errors for admin dashboard';

