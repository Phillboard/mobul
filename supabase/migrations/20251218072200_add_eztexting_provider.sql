-- ============================================================
-- Add EZTexting as SMS Provider
-- ============================================================
-- This migration adds EZTexting as a fourth SMS provider option
-- alongside NotificationAPI, Infobip, and Twilio.
--
-- EZTexting API Documentation: https://developers.eztexting.com

-- ============================================================
-- Step 1: Drop existing constraints that limit providers
-- ============================================================

-- Drop primary_provider constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sms_provider_settings_primary_provider_check'
    AND table_name = 'sms_provider_settings'
  ) THEN
    ALTER TABLE public.sms_provider_settings 
    DROP CONSTRAINT sms_provider_settings_primary_provider_check;
  END IF;
END $$;

-- Drop fallback_provider_1 constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sms_provider_settings_fallback_provider_1_check'
    AND table_name = 'sms_provider_settings'
  ) THEN
    ALTER TABLE public.sms_provider_settings 
    DROP CONSTRAINT sms_provider_settings_fallback_provider_1_check;
  END IF;
END $$;

-- Drop fallback_provider_2 constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sms_provider_settings_fallback_provider_2_check'
    AND table_name = 'sms_provider_settings'
  ) THEN
    ALTER TABLE public.sms_provider_settings 
    DROP CONSTRAINT sms_provider_settings_fallback_provider_2_check;
  END IF;
END $$;

-- ============================================================
-- Step 2: Add new constraints including EZTexting
-- ============================================================

-- Add updated primary_provider constraint
ALTER TABLE public.sms_provider_settings
ADD CONSTRAINT sms_provider_settings_primary_provider_check 
CHECK (primary_provider IN ('notificationapi', 'infobip', 'twilio', 'eztexting'));

-- ============================================================
-- Step 3: Add EZTexting configuration columns
-- ============================================================

-- Add EZTexting enabled flag
ALTER TABLE public.sms_provider_settings
ADD COLUMN IF NOT EXISTS eztexting_enabled BOOLEAN DEFAULT false;

-- Add EZTexting base URL
ALTER TABLE public.sms_provider_settings
ADD COLUMN IF NOT EXISTS eztexting_base_url TEXT DEFAULT 'https://a.eztexting.com';

-- Add EZTexting environment variable names (for documentation/reference)
ALTER TABLE public.sms_provider_settings
ADD COLUMN IF NOT EXISTS eztexting_username_env TEXT DEFAULT 'EZTEXTING_USERNAME';

ALTER TABLE public.sms_provider_settings
ADD COLUMN IF NOT EXISTS eztexting_password_env TEXT DEFAULT 'EZTEXTING_PASSWORD';

-- Add third fallback provider
ALTER TABLE public.sms_provider_settings
ADD COLUMN IF NOT EXISTS fallback_provider_3 TEXT;

-- Add constraint for fallback_provider_3
ALTER TABLE public.sms_provider_settings
ADD CONSTRAINT sms_provider_settings_fallback_provider_3_check 
CHECK (fallback_provider_3 IS NULL OR fallback_provider_3 IN ('notificationapi', 'infobip', 'twilio', 'eztexting'));

-- ============================================================
-- Step 4: Update provider_used constraints in log tables
-- ============================================================

-- Update sms_delivery_log constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sms_delivery_log_provider_used_check'
    AND table_name = 'sms_delivery_log'
  ) THEN
    ALTER TABLE public.sms_delivery_log 
    DROP CONSTRAINT sms_delivery_log_provider_used_check;
  END IF;
END $$;

ALTER TABLE public.sms_delivery_log
ADD CONSTRAINT sms_delivery_log_provider_used_check 
CHECK (provider_used IS NULL OR provider_used IN ('notificationapi', 'infobip', 'twilio', 'eztexting'));

-- Update sms_opt_in_log constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sms_opt_in_log_provider_used_check'
    AND table_name = 'sms_opt_in_log'
  ) THEN
    ALTER TABLE public.sms_opt_in_log 
    DROP CONSTRAINT sms_opt_in_log_provider_used_check;
  END IF;
END $$;

ALTER TABLE public.sms_opt_in_log
ADD CONSTRAINT sms_opt_in_log_provider_used_check 
CHECK (provider_used IS NULL OR provider_used IN ('notificationapi', 'infobip', 'twilio', 'eztexting'));

-- ============================================================
-- Step 5: Update existing settings row to enable EZTexting
-- ============================================================

-- Enable EZTexting and set as fallback_provider_3 for existing settings
UPDATE public.sms_provider_settings
SET 
  eztexting_enabled = true,
  fallback_provider_3 = 'eztexting'
WHERE eztexting_enabled IS NULL OR fallback_provider_3 IS NULL;

-- ============================================================
-- Step 6: Update helper function to include EZTexting
-- ============================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_sms_provider_settings();

-- Create updated function
CREATE OR REPLACE FUNCTION get_sms_provider_settings()
RETURNS TABLE (
  primary_provider TEXT,
  enable_fallback BOOLEAN,
  notificationapi_enabled BOOLEAN,
  notificationapi_notification_id TEXT,
  infobip_enabled BOOLEAN,
  infobip_base_url TEXT,
  infobip_sender_id TEXT,
  twilio_enabled BOOLEAN,
  eztexting_enabled BOOLEAN,
  eztexting_base_url TEXT,
  fallback_provider_1 TEXT,
  fallback_provider_2 TEXT,
  fallback_provider_3 TEXT,
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
    s.notificationapi_enabled,
    s.notificationapi_notification_id,
    s.infobip_enabled,
    s.infobip_base_url,
    s.infobip_sender_id,
    s.twilio_enabled,
    s.eztexting_enabled,
    s.eztexting_base_url,
    s.fallback_provider_1,
    s.fallback_provider_2,
    s.fallback_provider_3,
    s.fallback_on_error,
    s.updated_at
  FROM sms_provider_settings s
  LIMIT 1;
END;
$$;

-- Drop existing update function if exists
DROP FUNCTION IF EXISTS update_sms_provider_settings(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, BOOLEAN, BOOLEAN);

-- Create updated update function
CREATE OR REPLACE FUNCTION update_sms_provider_settings(
  p_primary_provider TEXT DEFAULT NULL,
  p_enable_fallback BOOLEAN DEFAULT NULL,
  p_infobip_enabled BOOLEAN DEFAULT NULL,
  p_infobip_base_url TEXT DEFAULT NULL,
  p_infobip_sender_id TEXT DEFAULT NULL,
  p_twilio_enabled BOOLEAN DEFAULT NULL,
  p_eztexting_enabled BOOLEAN DEFAULT NULL,
  p_eztexting_base_url TEXT DEFAULT NULL,
  p_fallback_provider_1 TEXT DEFAULT NULL,
  p_fallback_provider_2 TEXT DEFAULT NULL,
  p_fallback_provider_3 TEXT DEFAULT NULL,
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
  
  -- Update only provided fields
  UPDATE sms_provider_settings
  SET
    primary_provider = COALESCE(p_primary_provider, primary_provider),
    enable_fallback = COALESCE(p_enable_fallback, enable_fallback),
    infobip_enabled = COALESCE(p_infobip_enabled, infobip_enabled),
    infobip_base_url = COALESCE(p_infobip_base_url, infobip_base_url),
    infobip_sender_id = COALESCE(p_infobip_sender_id, infobip_sender_id),
    twilio_enabled = COALESCE(p_twilio_enabled, twilio_enabled),
    eztexting_enabled = COALESCE(p_eztexting_enabled, eztexting_enabled),
    eztexting_base_url = COALESCE(p_eztexting_base_url, eztexting_base_url),
    fallback_provider_1 = COALESCE(p_fallback_provider_1, fallback_provider_1),
    fallback_provider_2 = COALESCE(p_fallback_provider_2, fallback_provider_2),
    fallback_provider_3 = COALESCE(p_fallback_provider_3, fallback_provider_3),
    fallback_on_error = COALESCE(p_fallback_on_error, fallback_on_error),
    updated_by_user_id = auth.uid()
  WHERE id = v_settings_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_sms_provider_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION update_sms_provider_settings(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ============================================================
-- Step 7: Add comments for documentation
-- ============================================================

COMMENT ON COLUMN public.sms_provider_settings.eztexting_enabled IS 'Whether EZTexting provider is enabled';
COMMENT ON COLUMN public.sms_provider_settings.eztexting_base_url IS 'Base URL for EZTexting API (default: https://a.eztexting.com)';
COMMENT ON COLUMN public.sms_provider_settings.eztexting_username_env IS 'Environment variable name containing EZTexting username';
COMMENT ON COLUMN public.sms_provider_settings.eztexting_password_env IS 'Environment variable name containing EZTexting password';
COMMENT ON COLUMN public.sms_provider_settings.fallback_provider_3 IS 'Third fallback SMS provider';

-- ============================================================
-- Migration Complete
-- ============================================================
-- After running this migration:
-- 1. Add EZTEXTING_USERNAME and EZTEXTING_PASSWORD to Supabase secrets
-- 2. Configure webhooks in EZTexting dashboard
-- 3. Test SMS sending functionality
