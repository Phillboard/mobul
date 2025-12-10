-- Create rate limiting tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  identifier TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient rate limit queries
CREATE INDEX idx_rate_limit_tracking_lookup 
ON public.rate_limit_tracking(endpoint, identifier, created_at DESC);

-- Index for cleanup queries
CREATE INDEX idx_rate_limit_tracking_cleanup 
ON public.rate_limit_tracking(created_at);

-- Enable RLS (admin only access)
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Admin full access policy
CREATE POLICY "Admins can manage rate limit tracking"
ON public.rate_limit_tracking
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create function to clean up old rate limit entries (called by cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_tracking(retention_hours INTEGER DEFAULT 24)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limit_tracking
  WHERE created_at < now() - (retention_hours || ' hours')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON TABLE public.rate_limit_tracking IS 'Tracks API requests for rate limiting public endpoints';
COMMENT ON FUNCTION public.cleanup_rate_limit_tracking IS 'Cleans up old rate limit tracking entries older than specified hours';

-- Create alerts monitoring table
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'low_inventory',
    'high_error_rate', 
    'slow_api_response',
    'failed_sms_delivery',
    'payment_failure',
    'security_incident'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ
);

-- Index for unresolved alerts
CREATE INDEX idx_system_alerts_unresolved 
ON public.system_alerts(created_at DESC) 
WHERE NOT resolved;

-- Index for alert type queries
CREATE INDEX idx_system_alerts_type 
ON public.system_alerts(alert_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage system alerts"
ON public.system_alerts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Function to create system alert
CREATE OR REPLACE FUNCTION public.create_system_alert(
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO public.system_alerts (
    alert_type,
    severity,
    title,
    message,
    metadata
  ) VALUES (
    p_alert_type,
    p_severity,
    p_title,
    p_message,
    p_metadata
  )
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$;

COMMENT ON TABLE public.system_alerts IS 'System-wide alerts for monitoring and operational issues';
COMMENT ON FUNCTION public.create_system_alert IS 'Creates a new system alert with specified parameters';