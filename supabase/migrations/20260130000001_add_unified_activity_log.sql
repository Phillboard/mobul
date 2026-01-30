-- ============================================================================
-- Unified Activity Log Table
-- ============================================================================
-- Provides comprehensive activity tracking across all system components:
-- - Gift Card operations
-- - Campaign management
-- - Communications (calls, SMS)
-- - API & Webhooks
-- - User management
-- - System events
-- 
-- Supports ISO 27001, SOC 2, and government contract compliance requirements.
-- ============================================================================

-- Create the unified activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event classification
  category TEXT NOT NULL CHECK (category IN ('gift_card', 'campaign', 'communication', 'api', 'user', 'system')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'cancelled')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  
  -- Actor/Context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  organization_id UUID,
  
  -- Resource references (nullable - not all events have these)
  resource_type TEXT,
  resource_id UUID,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES public.recipients(id) ON DELETE SET NULL,
  
  -- Event details
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Request context
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.activity_log IS 'Unified activity logging for compliance and monitoring. Captures all significant system events.';

-- Column comments
COMMENT ON COLUMN public.activity_log.category IS 'Event category: gift_card, campaign, communication, api, user, system';
COMMENT ON COLUMN public.activity_log.event_type IS 'Specific event type within category (e.g., card_provisioned, login_success)';
COMMENT ON COLUMN public.activity_log.status IS 'Event outcome: success, failed, pending, cancelled';
COMMENT ON COLUMN public.activity_log.severity IS 'Event severity for filtering: info, warning, error, critical';
COMMENT ON COLUMN public.activity_log.request_id IS 'Correlation ID for tracing related events across services';

-- ============================================================================
-- Indexes for common query patterns
-- ============================================================================

-- Category-based filtering (most common)
CREATE INDEX idx_activity_log_category ON public.activity_log(category);

-- Time-based queries (dashboard stats, recent activity)
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- Composite index for category + time (Overview tab)
CREATE INDEX idx_activity_log_category_created_at ON public.activity_log(category, created_at DESC);

-- Client-scoped queries (multi-tenant filtering)
CREATE INDEX idx_activity_log_client_id ON public.activity_log(client_id) WHERE client_id IS NOT NULL;

-- User activity tracking
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id) WHERE user_id IS NOT NULL;

-- Status filtering (failed events monitoring)
CREATE INDEX idx_activity_log_status ON public.activity_log(status);

-- Campaign-specific activity
CREATE INDEX idx_activity_log_campaign_id ON public.activity_log(campaign_id) WHERE campaign_id IS NOT NULL;

-- Recipient-specific activity
CREATE INDEX idx_activity_log_recipient_id ON public.activity_log(recipient_id) WHERE recipient_id IS NOT NULL;

-- Request correlation
CREATE INDEX idx_activity_log_request_id ON public.activity_log(request_id) WHERE request_id IS NOT NULL;

-- Severity-based filtering (alerts, error tracking)
CREATE INDEX idx_activity_log_severity ON public.activity_log(severity) WHERE severity IN ('warning', 'error', 'critical');

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all activity logs
CREATE POLICY "Platform admins can view all activity logs"
ON public.activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Agency owners can view logs for their organization's clients
CREATE POLICY "Agency owners can view organization activity logs"
ON public.activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.org_members om ON om.user_id = ur.user_id
    JOIN public.clients c ON c.org_id = om.org_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'agency_owner'
    AND activity_log.client_id = c.id
  )
);

-- Company owners and users can view logs for their clients
CREATE POLICY "Company users can view their client activity logs"
ON public.activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.client_users cu ON cu.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('company_owner', 'call_center')
    AND activity_log.client_id = cu.client_id
  )
);

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert activity logs"
ON public.activity_log FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to insert their own activity (with proper context)
CREATE POLICY "Authenticated users can insert activity logs"
ON public.activity_log FOR INSERT
TO authenticated
WITH CHECK (
  -- Must have a user_id that matches the current user, OR be service role
  user_id = auth.uid() OR user_id IS NULL
);

-- ============================================================================
-- Helper function for logging activities from edge functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_activity(
  p_category TEXT,
  p_event_type TEXT,
  p_status TEXT,
  p_description TEXT,
  p_user_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_organization_id UUID;
BEGIN
  -- Get organization_id from client if provided
  IF p_client_id IS NOT NULL THEN
    SELECT organization_id INTO v_organization_id 
    FROM public.clients 
    WHERE id = p_client_id;
  END IF;

  INSERT INTO public.activity_log (
    category,
    event_type,
    status,
    severity,
    user_id,
    client_id,
    organization_id,
    campaign_id,
    recipient_id,
    resource_type,
    resource_id,
    description,
    metadata,
    ip_address,
    user_agent,
    request_id
  ) VALUES (
    p_category,
    p_event_type,
    p_status,
    p_severity,
    p_user_id,
    p_client_id,
    v_organization_id,
    p_campaign_id,
    p_recipient_id,
    p_resource_type,
    p_resource_id,
    p_description,
    p_metadata,
    p_ip_address,
    p_user_agent,
    p_request_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail the calling operation - just log to console and return NULL
    RAISE WARNING 'Failed to log activity: %', SQLERRM;
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.log_activity IS 'Non-blocking activity logging function for edge functions';

-- Grant execute to service role and authenticated users
GRANT EXECUTE ON FUNCTION public.log_activity TO service_role;
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;

-- ============================================================================
-- View for activity statistics (used by frontend)
-- ============================================================================

CREATE OR REPLACE VIEW public.activity_stats AS
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

-- Grant select on the view
GRANT SELECT ON public.activity_stats TO authenticated;
GRANT SELECT ON public.activity_stats TO service_role;
