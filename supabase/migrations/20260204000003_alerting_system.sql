-- ============================================================================
-- Alerting System
-- ============================================================================
-- Provides role-scoped alerting with configurable rules and notifications.
-- Alerts can be platform-wide (admin), org-wide (agency), or client-specific.
-- ============================================================================

-- ============================================================================
-- 1. Alert Rules Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope (NULL = platform-wide, admin only)
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Rule definition
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  
  -- Trigger conditions
  category TEXT NOT NULL CHECK (category IN ('gift_card', 'campaign', 'communication', 'api', 'user', 'system', 'billing')),
  event_type TEXT, -- NULL = any event in category
  severity_threshold TEXT CHECK (severity_threshold IN ('info', 'warning', 'error', 'critical')),
  count_threshold INTEGER, -- Alert if count exceeds this in time window
  time_window_minutes INTEGER DEFAULT 60,
  
  -- Notification settings
  notify_email BOOLEAN DEFAULT false,
  notify_in_app BOOLEAN DEFAULT true,
  notify_slack BOOLEAN DEFAULT false,
  slack_webhook_url TEXT,
  
  -- Who to notify
  notify_roles TEXT[] DEFAULT '{}',
  notify_user_ids UUID[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT alert_rules_threshold_check CHECK (
    severity_threshold IS NOT NULL OR count_threshold IS NOT NULL
  )
);

COMMENT ON TABLE public.alert_rules IS 'Configurable alert rules with role-scoped visibility';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_org ON public.alert_rules(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_rules_client ON public.alert_rules(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_rules_category ON public.alert_rules(category);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON public.alert_rules(enabled) WHERE enabled = true;

-- ============================================================================
-- 2. Alert Instances Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alert_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to rule (nullable for ad-hoc alerts)
  rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  
  -- Scope
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Alert content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Source activity (for linking back)
  source_activity_id UUID REFERENCES public.activity_log(id) ON DELETE SET NULL,
  
  -- Lifecycle
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  
  -- Additional data
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.alert_instances IS 'Triggered alert instances with lifecycle tracking';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_instances_org ON public.alert_instances(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_instances_client ON public.alert_instances(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_instances_severity ON public.alert_instances(severity);
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered ON public.alert_instances(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_instances_unacknowledged ON public.alert_instances(organization_id, triggered_at DESC) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_instances_unresolved ON public.alert_instances(organization_id, triggered_at DESC) WHERE resolved_at IS NULL;

-- ============================================================================
-- 3. RLS Policies
-- ============================================================================

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_instances ENABLE ROW LEVEL SECURITY;

-- Alert Rules Policies

-- Admins can manage all alert rules
CREATE POLICY "Admins can manage all alert rules"
ON public.alert_rules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Agency owners can manage their org's alert rules
CREATE POLICY "Agency owners can manage org alert rules"
ON public.alert_rules FOR ALL
TO authenticated
USING (
  organization_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.org_members om ON om.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'agency_owner'
    AND alert_rules.organization_id = om.org_id
  )
)
WITH CHECK (
  organization_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.org_members om ON om.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'agency_owner'
    AND alert_rules.organization_id = om.org_id
  )
);

-- Client owners can view their client's alert rules
CREATE POLICY "Client users can view client alert rules"
ON public.alert_rules FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.user_id = auth.uid() 
    AND alert_rules.client_id = cu.client_id
  )
);

-- Alert Instances Policies

-- Admins can view all alert instances
CREATE POLICY "Admins can view all alert instances"
ON public.alert_instances FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Admins can update alert instances
CREATE POLICY "Admins can update alert instances"
ON public.alert_instances FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Agency owners can view and update their org's alerts
CREATE POLICY "Agency owners can view org alerts"
ON public.alert_instances FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.org_members om ON om.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'agency_owner'
    AND alert_instances.organization_id = om.org_id
  )
);

CREATE POLICY "Agency owners can update org alerts"
ON public.alert_instances FOR UPDATE
TO authenticated
USING (
  organization_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.org_members om ON om.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'agency_owner'
    AND alert_instances.organization_id = om.org_id
  )
)
WITH CHECK (
  organization_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.org_members om ON om.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'agency_owner'
    AND alert_instances.organization_id = om.org_id
  )
);

-- Client users can view their client's alerts
CREATE POLICY "Client users can view client alerts"
ON public.alert_instances FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.user_id = auth.uid() 
    AND alert_instances.client_id = cu.client_id
  )
);

-- Service role can insert alerts
CREATE POLICY "Service role can insert alerts"
ON public.alert_instances FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can manage alert rules"
ON public.alert_rules FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. Alert Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_alert(
  p_title TEXT,
  p_message TEXT,
  p_severity TEXT,
  p_organization_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_rule_id UUID DEFAULT NULL,
  p_source_activity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO public.alert_instances (
    rule_id,
    organization_id,
    client_id,
    title,
    message,
    severity,
    source_activity_id,
    metadata
  ) VALUES (
    p_rule_id,
    p_organization_id,
    p_client_id,
    p_title,
    p_message,
    p_severity,
    p_source_activity_id,
    p_metadata
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_alert IS 'Create a new alert instance';

-- ============================================================================
-- 5. Get Active Alerts Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_active_alerts(
  p_org_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  message TEXT,
  severity TEXT,
  triggered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  organization_id UUID,
  client_id UUID,
  metadata JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.title,
    ai.message,
    ai.severity,
    ai.triggered_at,
    ai.acknowledged_at,
    ai.organization_id,
    ai.client_id,
    ai.metadata
  FROM public.alert_instances ai
  WHERE ai.resolved_at IS NULL
    AND (p_org_id IS NULL OR ai.organization_id = p_org_id)
    AND (p_client_id IS NULL OR ai.client_id = p_client_id)
  ORDER BY 
    CASE ai.severity 
      WHEN 'critical' THEN 1 
      WHEN 'warning' THEN 2 
      ELSE 3 
    END,
    ai.triggered_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_active_alerts IS 'Get active (unresolved) alerts for an organization or client';

-- ============================================================================
-- 6. Default Alert Rules
-- ============================================================================

-- Platform-wide critical error alert (admin only)
INSERT INTO public.alert_rules (
  name, description, category, severity_threshold, 
  notify_in_app, notify_roles
) VALUES (
  'Critical Errors',
  'Alert when critical errors occur in the system',
  'system',
  'critical',
  true,
  ARRAY['admin', 'tech_support']
) ON CONFLICT DO NOTHING;

-- Gift card provisioning failures (platform-wide)
INSERT INTO public.alert_rules (
  name, description, category, event_type, severity_threshold,
  notify_in_app, notify_roles
) VALUES (
  'Gift Card Provisioning Failures',
  'Alert when gift card provisioning fails',
  'gift_card',
  'provision_failed',
  'error',
  true,
  ARRAY['admin', 'tech_support']
) ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.trigger_alert TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_alerts TO service_role;

GRANT SELECT ON public.alert_rules TO authenticated;
GRANT SELECT, UPDATE ON public.alert_instances TO authenticated;
GRANT ALL ON public.alert_rules TO service_role;
GRANT ALL ON public.alert_instances TO service_role;
