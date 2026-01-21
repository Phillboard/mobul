-- ============================================================
-- Hierarchical Twilio Configuration Migration
-- ============================================================
-- This migration adds hierarchical Twilio configuration support:
-- - Client-level Twilio (individual roofers)
-- - Agency-level Twilio (agency owners)
-- - Admin/Master-level Twilio (platform admins)
--
-- Fallback chain: Client → Agency → Admin → Environment Variables
-- ============================================================

-- ============================================================
-- SECTION 1: Add Twilio Columns to CLIENTS Table
-- ============================================================

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_auth_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT,
ADD COLUMN IF NOT EXISTS twilio_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS twilio_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS twilio_configured_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS twilio_configured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS twilio_friendly_name TEXT,
ADD COLUMN IF NOT EXISTS twilio_monthly_limit INTEGER,
ADD COLUMN IF NOT EXISTS twilio_current_month_usage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS twilio_last_error TEXT,
ADD COLUMN IF NOT EXISTS twilio_last_error_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS twilio_validation_error TEXT,
ADD COLUMN IF NOT EXISTS twilio_failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS twilio_circuit_open_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS twilio_config_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS twilio_revalidate_after TIMESTAMPTZ;

-- Add E.164 format constraint for client phone numbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'clients_twilio_phone_e164_check'
  ) THEN
    ALTER TABLE public.clients
    ADD CONSTRAINT clients_twilio_phone_e164_check
    CHECK (twilio_phone_number IS NULL OR twilio_phone_number ~ '^\+[1-9]\d{1,14}$');
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.clients.twilio_account_sid IS 'Client Twilio Account SID';
COMMENT ON COLUMN public.clients.twilio_auth_token_encrypted IS 'Client Twilio Auth Token (encrypted via Vault)';
COMMENT ON COLUMN public.clients.twilio_phone_number IS 'Client Twilio phone number for SMS sending (E.164 format)';
COMMENT ON COLUMN public.clients.twilio_enabled IS 'Whether to use client-level Twilio (if false, falls back to agency)';
COMMENT ON COLUMN public.clients.twilio_validated_at IS 'Last successful connection validation timestamp';
COMMENT ON COLUMN public.clients.twilio_configured_by IS 'User who configured this Twilio setup';
COMMENT ON COLUMN public.clients.twilio_configured_at IS 'When this Twilio was configured';
COMMENT ON COLUMN public.clients.twilio_friendly_name IS 'Human-readable identifier for logs';
COMMENT ON COLUMN public.clients.twilio_monthly_limit IS 'Optional monthly SMS spend cap';
COMMENT ON COLUMN public.clients.twilio_current_month_usage IS 'Current month SMS count (reset monthly)';
COMMENT ON COLUMN public.clients.twilio_last_error IS 'Last error message for debugging';
COMMENT ON COLUMN public.clients.twilio_last_error_at IS 'When last error occurred';
COMMENT ON COLUMN public.clients.twilio_validation_error IS 'Why validation failed (if applicable)';
COMMENT ON COLUMN public.clients.twilio_failure_count IS 'Consecutive failure count for circuit breaker';
COMMENT ON COLUMN public.clients.twilio_circuit_open_until IS 'Circuit breaker timeout (skip until this time)';
COMMENT ON COLUMN public.clients.twilio_config_version IS 'Version for optimistic locking';
COMMENT ON COLUMN public.clients.twilio_revalidate_after IS 'When revalidation is needed (validated_at + 30 days)';

-- ============================================================
-- SECTION 2: Add Twilio Columns to AGENCIES Table
-- ============================================================

ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_auth_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT,
ADD COLUMN IF NOT EXISTS twilio_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS twilio_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS twilio_configured_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS twilio_configured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS twilio_friendly_name TEXT,
ADD COLUMN IF NOT EXISTS twilio_monthly_limit INTEGER,
ADD COLUMN IF NOT EXISTS twilio_current_month_usage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS twilio_last_error TEXT,
ADD COLUMN IF NOT EXISTS twilio_last_error_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS twilio_validation_error TEXT,
ADD COLUMN IF NOT EXISTS twilio_failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS twilio_circuit_open_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS twilio_config_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS twilio_revalidate_after TIMESTAMPTZ;

-- Add E.164 format constraint for agency phone numbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'agencies_twilio_phone_e164_check'
  ) THEN
    ALTER TABLE public.agencies
    ADD CONSTRAINT agencies_twilio_phone_e164_check
    CHECK (twilio_phone_number IS NULL OR twilio_phone_number ~ '^\+[1-9]\d{1,14}$');
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.agencies.twilio_account_sid IS 'Agency Twilio Account SID';
COMMENT ON COLUMN public.agencies.twilio_auth_token_encrypted IS 'Agency Twilio Auth Token (encrypted via Vault)';
COMMENT ON COLUMN public.agencies.twilio_phone_number IS 'Agency default Twilio phone number (E.164 format)';
COMMENT ON COLUMN public.agencies.twilio_enabled IS 'Whether agency-level Twilio is active';
COMMENT ON COLUMN public.agencies.twilio_validated_at IS 'Last validation timestamp';
COMMENT ON COLUMN public.agencies.twilio_configured_by IS 'User who configured this';
COMMENT ON COLUMN public.agencies.twilio_configured_at IS 'When configured';
COMMENT ON COLUMN public.agencies.twilio_friendly_name IS 'Human-readable identifier';
COMMENT ON COLUMN public.agencies.twilio_monthly_limit IS 'Optional monthly limit';
COMMENT ON COLUMN public.agencies.twilio_current_month_usage IS 'Current month usage';
COMMENT ON COLUMN public.agencies.twilio_last_error IS 'Last error message';
COMMENT ON COLUMN public.agencies.twilio_last_error_at IS 'When last error occurred';
COMMENT ON COLUMN public.agencies.twilio_validation_error IS 'Validation error reason';
COMMENT ON COLUMN public.agencies.twilio_failure_count IS 'For circuit breaker';
COMMENT ON COLUMN public.agencies.twilio_circuit_open_until IS 'Circuit breaker timeout';
COMMENT ON COLUMN public.agencies.twilio_config_version IS 'Optimistic locking version';
COMMENT ON COLUMN public.agencies.twilio_revalidate_after IS 'When revalidation needed';

-- ============================================================
-- SECTION 3: Add Admin Twilio Columns to SMS_PROVIDER_SETTINGS
-- ============================================================

ALTER TABLE public.sms_provider_settings
ADD COLUMN IF NOT EXISTS admin_twilio_account_sid TEXT,
ADD COLUMN IF NOT EXISTS admin_twilio_auth_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS admin_twilio_phone_number TEXT,
ADD COLUMN IF NOT EXISTS admin_twilio_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS admin_twilio_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_twilio_friendly_name TEXT DEFAULT 'Platform Master',
ADD COLUMN IF NOT EXISTS admin_twilio_last_error TEXT,
ADD COLUMN IF NOT EXISTS admin_twilio_last_error_at TIMESTAMPTZ;

COMMENT ON COLUMN public.sms_provider_settings.admin_twilio_account_sid IS 'Master/Admin Twilio Account SID (fallback for all)';
COMMENT ON COLUMN public.sms_provider_settings.admin_twilio_auth_token_encrypted IS 'Master Auth Token (encrypted via Vault)';
COMMENT ON COLUMN public.sms_provider_settings.admin_twilio_phone_number IS 'Master Twilio phone number (e.g., 1-877 number)';
COMMENT ON COLUMN public.sms_provider_settings.admin_twilio_enabled IS 'Whether admin Twilio is active';
COMMENT ON COLUMN public.sms_provider_settings.admin_twilio_validated_at IS 'Last validation timestamp';
COMMENT ON COLUMN public.sms_provider_settings.admin_twilio_friendly_name IS 'Display name for admin Twilio';
COMMENT ON COLUMN public.sms_provider_settings.admin_twilio_last_error IS 'Last error for debugging';
COMMENT ON COLUMN public.sms_provider_settings.admin_twilio_last_error_at IS 'When last error occurred';

-- ============================================================
-- SECTION 4: Create Twilio Configuration Audit Log Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.twilio_config_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'agency', 'admin')),
  entity_id UUID, -- NULL for admin level
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'enabled', 'disabled', 'validated', 'removed', 'circuit_opened', 'circuit_closed')),
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  old_values JSONB, -- Never includes auth token
  new_values JSONB, -- Never includes auth token
  ip_address TEXT
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_twilio_audit_entity ON public.twilio_config_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_twilio_audit_changed_at ON public.twilio_config_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_twilio_audit_changed_by ON public.twilio_config_audit_log(changed_by);

COMMENT ON TABLE public.twilio_config_audit_log IS 'Audit trail for all Twilio configuration changes. Auth tokens are NEVER stored here.';
COMMENT ON COLUMN public.twilio_config_audit_log.entity_type IS 'Which level: client, agency, or admin';
COMMENT ON COLUMN public.twilio_config_audit_log.entity_id IS 'UUID of client or agency (NULL for admin)';
COMMENT ON COLUMN public.twilio_config_audit_log.action IS 'Type of change made';
COMMENT ON COLUMN public.twilio_config_audit_log.old_values IS 'Previous values (never includes auth token)';
COMMENT ON COLUMN public.twilio_config_audit_log.new_values IS 'New values (never includes auth token)';

-- ============================================================
-- SECTION 5: Create Twilio Fallback Events Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.twilio_fallback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  attempted_level TEXT NOT NULL CHECK (attempted_level IN ('client', 'agency', 'admin')),
  actual_level_used TEXT NOT NULL CHECK (actual_level_used IN ('client', 'agency', 'admin', 'env')),
  reason TEXT NOT NULL,
  sms_delivery_log_id UUID, -- Link to sms_delivery_log if applicable
  occurred_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fallback events
CREATE INDEX IF NOT EXISTS idx_twilio_fallback_client ON public.twilio_fallback_events(client_id);
CREATE INDEX IF NOT EXISTS idx_twilio_fallback_occurred ON public.twilio_fallback_events(occurred_at DESC);

COMMENT ON TABLE public.twilio_fallback_events IS 'Records when SMS fallback to a different Twilio level occurs';
COMMENT ON COLUMN public.twilio_fallback_events.attempted_level IS 'The level that was attempted first';
COMMENT ON COLUMN public.twilio_fallback_events.actual_level_used IS 'The level that actually sent the SMS';
COMMENT ON COLUMN public.twilio_fallback_events.reason IS 'Why fallback was needed';

-- ============================================================
-- SECTION 6: Create Twilio Notifications Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.twilio_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'agency', 'admin')),
  entity_id UUID,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'validation_expiring', 
    'validation_expired', 
    'credentials_failed', 
    'fallback_activated', 
    'usage_warning'
  )),
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email'))
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_twilio_notif_user ON public.twilio_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_twilio_notif_entity ON public.twilio_notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_twilio_notif_unack ON public.twilio_notifications(user_id) WHERE acknowledged_at IS NULL;

COMMENT ON TABLE public.twilio_notifications IS 'Notifications sent to users about their Twilio configuration';

-- ============================================================
-- SECTION 7: Add Twilio Tracking Columns to SMS Delivery Log
-- ============================================================

ALTER TABLE public.sms_delivery_log
ADD COLUMN IF NOT EXISTS twilio_level_used TEXT CHECK (twilio_level_used IN ('client', 'agency', 'admin', 'env')),
ADD COLUMN IF NOT EXISTS twilio_entity_id UUID,
ADD COLUMN IF NOT EXISTS twilio_from_number_used TEXT,
ADD COLUMN IF NOT EXISTS twilio_fallback_occurred BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS twilio_fallback_reason TEXT,
ADD COLUMN IF NOT EXISTS twilio_resolution_time_ms INTEGER;

COMMENT ON COLUMN public.sms_delivery_log.twilio_level_used IS 'Which Twilio level sent this SMS';
COMMENT ON COLUMN public.sms_delivery_log.twilio_entity_id IS 'ID of client/agency whose Twilio was used';
COMMENT ON COLUMN public.sms_delivery_log.twilio_from_number_used IS 'Actual phone number that sent';
COMMENT ON COLUMN public.sms_delivery_log.twilio_fallback_occurred IS 'Whether fallback was needed';
COMMENT ON COLUMN public.sms_delivery_log.twilio_fallback_reason IS 'Why fallback was needed';
COMMENT ON COLUMN public.sms_delivery_log.twilio_resolution_time_ms IS 'Time to resolve credentials';

-- ============================================================
-- SECTION 8: Performance Indexes
-- ============================================================

-- Index for quickly finding clients with Twilio enabled
CREATE INDEX IF NOT EXISTS idx_clients_twilio_enabled 
ON public.clients(id) 
WHERE twilio_enabled = TRUE;

-- Index for quickly finding agencies with Twilio enabled
CREATE INDEX IF NOT EXISTS idx_agencies_twilio_enabled 
ON public.agencies(id) 
WHERE twilio_enabled = TRUE;

-- Index for finding clients by agency (for fallback lookup)
CREATE INDEX IF NOT EXISTS idx_clients_agency_id_twilio 
ON public.clients(agency_id) 
WHERE agency_id IS NOT NULL;

-- ============================================================
-- SECTION 9: RLS Policies for Twilio Configuration
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE public.twilio_config_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_fallback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_notifications ENABLE ROW LEVEL SECURITY;

-- Audit Log: Only admins can view (inserts are via service role)
CREATE POLICY "Admins can view Twilio audit log"
ON public.twilio_config_audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Fallback Events: Admins see all, agency owners see their clients
CREATE POLICY "Admins can view all fallback events"
ON public.twilio_fallback_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agency owners view their client fallback events"
ON public.twilio_fallback_events FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.user_agencies ua ON ua.agency_id = c.agency_id
    WHERE ua.user_id = auth.uid() AND ua.role = 'owner'
  )
);

CREATE POLICY "Client owners view own fallback events"
ON public.twilio_fallback_events FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
  )
);

-- Notifications: Users see their own
CREATE POLICY "Users view own Twilio notifications"
ON public.twilio_notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users acknowledge own Twilio notifications"
ON public.twilio_notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- SECTION 10: Helper Functions
-- ============================================================

-- Function to get Twilio config status for a client
CREATE OR REPLACE FUNCTION get_client_twilio_status(p_client_id UUID)
RETURNS TABLE (
  has_own_config BOOLEAN,
  is_enabled BOOLEAN,
  is_validated BOOLEAN,
  phone_number TEXT,
  account_sid_last4 TEXT,
  fallback_level TEXT,
  fallback_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_agency RECORD;
  v_admin RECORD;
BEGIN
  -- Get client config
  SELECT 
    c.twilio_account_sid,
    c.twilio_phone_number,
    c.twilio_enabled,
    c.twilio_validated_at,
    c.agency_id
  INTO v_client
  FROM clients c
  WHERE c.id = p_client_id;

  -- Check if client has own config
  has_own_config := v_client.twilio_account_sid IS NOT NULL;
  is_enabled := COALESCE(v_client.twilio_enabled, FALSE);
  is_validated := v_client.twilio_validated_at IS NOT NULL;
  phone_number := v_client.twilio_phone_number;
  account_sid_last4 := CASE 
    WHEN v_client.twilio_account_sid IS NOT NULL 
    THEN RIGHT(v_client.twilio_account_sid, 4)
    ELSE NULL
  END;

  -- Determine fallback
  IF is_enabled AND is_validated THEN
    fallback_level := NULL;
    fallback_phone := NULL;
  ELSE
    -- Check agency
    SELECT 
      a.twilio_enabled,
      a.twilio_validated_at,
      a.twilio_phone_number
    INTO v_agency
    FROM agencies a
    WHERE a.id = v_client.agency_id;

    IF v_agency.twilio_enabled AND v_agency.twilio_validated_at IS NOT NULL THEN
      fallback_level := 'agency';
      fallback_phone := v_agency.twilio_phone_number;
    ELSE
      -- Check admin
      SELECT 
        s.admin_twilio_enabled,
        s.admin_twilio_validated_at,
        s.admin_twilio_phone_number
      INTO v_admin
      FROM sms_provider_settings s
      LIMIT 1;

      IF v_admin.admin_twilio_enabled AND v_admin.admin_twilio_validated_at IS NOT NULL THEN
        fallback_level := 'admin';
        fallback_phone := v_admin.admin_twilio_phone_number;
      ELSE
        fallback_level := 'env';
        fallback_phone := NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEXT;
END;
$$;

-- Function to reset monthly Twilio usage (called by cron job on 1st of month)
CREATE OR REPLACE FUNCTION reset_monthly_twilio_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clients SET twilio_current_month_usage = 0;
  UPDATE agencies SET twilio_current_month_usage = 0;
END;
$$;

-- Function to increment Twilio usage
CREATE OR REPLACE FUNCTION increment_twilio_usage(
  p_level TEXT,
  p_entity_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_level = 'client' THEN
    UPDATE clients 
    SET twilio_current_month_usage = COALESCE(twilio_current_month_usage, 0) + 1
    WHERE id = p_entity_id;
  ELSIF p_level = 'agency' THEN
    UPDATE agencies 
    SET twilio_current_month_usage = COALESCE(twilio_current_month_usage, 0) + 1
    WHERE id = p_entity_id;
  END IF;
END;
$$;

-- ============================================================
-- SECTION 11: Grant Permissions
-- ============================================================

GRANT SELECT ON public.twilio_config_audit_log TO authenticated;
GRANT SELECT ON public.twilio_fallback_events TO authenticated;
GRANT SELECT, UPDATE ON public.twilio_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_twilio_status(UUID) TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
-- After running this migration:
-- 1. Deploy updated edge functions
-- 2. Update frontend to use new Twilio configuration UI
-- 3. Migrate existing TWILIO_* env vars to admin_twilio_* columns
