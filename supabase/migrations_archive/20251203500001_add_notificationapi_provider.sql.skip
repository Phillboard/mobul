-- ============================================================
-- Add NotificationAPI as Third SMS Provider
-- ============================================================
-- Extends the SMS provider system to support NotificationAPI
-- as the primary provider with Infobip and Twilio as fallbacks

-- ============================================================
-- Step 1: Drop existing constraints and functions
-- ============================================================

-- Drop the existing check constraint on primary_provider
ALTER TABLE public.sms_provider_settings 
DROP CONSTRAINT IF EXISTS sms_provider_settings_primary_provider_check;

-- Drop existing functions to recreate with new parameters
DROP FUNCTION IF EXISTS get_sms_provider_settings();
DROP FUNCTION IF EXISTS update_sms_provider_settings(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, BOOLEAN, BOOLEAN);

-- ============================================================
-- Step 2: Add NotificationAPI columns to sms_provider_settings
-- ============================================================

-- Add NotificationAPI configuration columns
ALTER TABLE public.sms_provider_settings
ADD COLUMN IF NOT EXISTS notificationapi_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notificationapi_client_id_name TEXT DEFAULT 'NOTIFICATIONAPI_CLIENT_ID',
ADD COLUMN IF NOT EXISTS notificationapi_client_secret_name TEXT DEFAULT 'NOTIFICATIONAPI_CLIENT_SECRET',
ADD COLUMN IF NOT EXISTS notificationapi_notification_id TEXT;

-- Add fallback chain columns for explicit provider ordering
ALTER TABLE public.sms_provider_settings
ADD COLUMN IF NOT EXISTS fallback_provider_1 TEXT DEFAULT 'infobip',
ADD COLUMN IF NOT EXISTS fallback_provider_2 TEXT DEFAULT 'twilio';

-- ============================================================
-- Step 3: Add new check constraint including notificationapi
-- ============================================================

ALTER TABLE public.sms_provider_settings
ADD CONSTRAINT sms_provider_settings_primary_provider_check 
CHECK (primary_provider IN ('notificationapi', 'infobip', 'twilio'));

-- Add check constraints for fallback providers
ALTER TABLE public.sms_provider_settings
ADD CONSTRAINT sms_provider_settings_fallback1_check 
CHECK (fallback_provider_1 IS NULL OR fallback_provider_1 IN ('notificationapi', 'infobip', 'twilio'));

ALTER TABLE public.sms_provider_settings
ADD CONSTRAINT sms_provider_settings_fallback2_check 
CHECK (fallback_provider_2 IS NULL OR fallback_provider_2 IN ('notificationapi', 'infobip', 'twilio'));

-- ============================================================
-- Step 4: Update provider_used constraints in log tables
-- ============================================================

-- Update sms_delivery_log constraint
ALTER TABLE public.sms_delivery_log 
DROP CONSTRAINT IF EXISTS sms_delivery_log_provider_used_check;

ALTER TABLE public.sms_delivery_log
ADD CONSTRAINT sms_delivery_log_provider_used_check 
CHECK (provider_used IS NULL OR provider_used IN ('notificationapi', 'infobip', 'twilio'));

-- Update sms_opt_in_log constraint
ALTER TABLE public.sms_opt_in_log 
DROP CONSTRAINT IF EXISTS sms_opt_in_log_provider_used_check;

ALTER TABLE public.sms_opt_in_log
ADD CONSTRAINT sms_opt_in_log_provider_used_check 
CHECK (provider_used IS NULL OR provider_used IN ('notificationapi', 'infobip', 'twilio'));

-- ============================================================
-- Step 5: Update default settings to use NotificationAPI as primary
-- ============================================================

UPDATE public.sms_provider_settings
SET 
  primary_provider = 'notificationapi',
  notificationapi_enabled = true,
  fallback_provider_1 = 'infobip',
  fallback_provider_2 = 'twilio'
WHERE id IS NOT NULL;

-- ============================================================
-- Step 6: Recreate helper functions with NotificationAPI support
-- ============================================================

-- Function to get current SMS provider settings
CREATE OR REPLACE FUNCTION get_sms_provider_settings()
RETURNS TABLE (
  primary_provider TEXT,
  enable_fallback BOOLEAN,
  fallback_provider_1 TEXT,
  fallback_provider_2 TEXT,
  notificationapi_enabled BOOLEAN,
  notificationapi_notification_id TEXT,
  infobip_enabled BOOLEAN,
  infobip_base_url TEXT,
  infobip_sender_id TEXT,
  twilio_enabled BOOLEAN,
  fallback_on_error BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.primary_provider,
    s.enable_fallback,
    s.fallback_provider_1,
    s.fallback_provider_2,
    s.notificationapi_enabled,
    s.notificationapi_notification_id,
    s.infobip_enabled,
    s.infobip_base_url,
    s.infobip_sender_id,
    s.twilio_enabled,
    s.fallback_on_error,
    s.updated_at
  FROM sms_provider_settings s
  LIMIT 1;
END;
$$;

-- Function to update SMS provider settings (extended for NotificationAPI)
CREATE OR REPLACE FUNCTION update_sms_provider_settings(
  p_primary_provider TEXT DEFAULT NULL,
  p_enable_fallback BOOLEAN DEFAULT NULL,
  p_fallback_provider_1 TEXT DEFAULT NULL,
  p_fallback_provider_2 TEXT DEFAULT NULL,
  p_notificationapi_enabled BOOLEAN DEFAULT NULL,
  p_notificationapi_notification_id TEXT DEFAULT NULL,
  p_infobip_enabled BOOLEAN DEFAULT NULL,
  p_infobip_base_url TEXT DEFAULT NULL,
  p_infobip_sender_id TEXT DEFAULT NULL,
  p_twilio_enabled BOOLEAN DEFAULT NULL,
  p_fallback_on_error BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  -- Get existing settings ID
  SELECT id INTO v_settings_id FROM sms_provider_settings LIMIT 1;
  
  IF v_settings_id IS NULL THEN
    RAISE EXCEPTION 'SMS provider settings not initialized';
  END IF;
  
  -- Validate primary_provider if provided
  IF p_primary_provider IS NOT NULL AND p_primary_provider NOT IN ('notificationapi', 'infobip', 'twilio') THEN
    RAISE EXCEPTION 'Invalid primary_provider. Must be notificationapi, infobip, or twilio';
  END IF;
  
  -- Update only provided fields
  UPDATE sms_provider_settings
  SET
    primary_provider = COALESCE(p_primary_provider, primary_provider),
    enable_fallback = COALESCE(p_enable_fallback, enable_fallback),
    fallback_provider_1 = COALESCE(p_fallback_provider_1, fallback_provider_1),
    fallback_provider_2 = COALESCE(p_fallback_provider_2, fallback_provider_2),
    notificationapi_enabled = COALESCE(p_notificationapi_enabled, notificationapi_enabled),
    notificationapi_notification_id = COALESCE(p_notificationapi_notification_id, notificationapi_notification_id),
    infobip_enabled = COALESCE(p_infobip_enabled, infobip_enabled),
    infobip_base_url = COALESCE(p_infobip_base_url, infobip_base_url),
    infobip_sender_id = COALESCE(p_infobip_sender_id, infobip_sender_id),
    twilio_enabled = COALESCE(p_twilio_enabled, twilio_enabled),
    fallback_on_error = COALESCE(p_fallback_on_error, fallback_on_error),
    updated_by_user_id = auth.uid(),
    updated_at = now()
  WHERE id = v_settings_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_sms_provider_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION update_sms_provider_settings(TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

-- ============================================================
-- Step 7: Add comments for documentation
-- ============================================================

COMMENT ON COLUMN public.sms_provider_settings.notificationapi_enabled IS 'Whether NotificationAPI provider is enabled';
COMMENT ON COLUMN public.sms_provider_settings.notificationapi_client_id_name IS 'Environment variable name for NotificationAPI Client ID';
COMMENT ON COLUMN public.sms_provider_settings.notificationapi_client_secret_name IS 'Environment variable name for NotificationAPI Client Secret';
COMMENT ON COLUMN public.sms_provider_settings.notificationapi_notification_id IS 'NotificationAPI template/notification ID for SMS';
COMMENT ON COLUMN public.sms_provider_settings.fallback_provider_1 IS 'First fallback provider when primary fails';
COMMENT ON COLUMN public.sms_provider_settings.fallback_provider_2 IS 'Second fallback provider when first fallback fails';

-- ============================================================
-- Step 8: Create index for provider queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sms_delivery_log_provider_notificationapi 
ON public.sms_delivery_log(provider_used) 
WHERE provider_used = 'notificationapi';

CREATE INDEX IF NOT EXISTS idx_sms_opt_in_log_provider_notificationapi 
ON public.sms_opt_in_log(provider_used) 
WHERE provider_used = 'notificationapi';

