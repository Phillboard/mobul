-- ============================================================
-- SMS Provider Settings Table
-- ============================================================
-- Global admin-level configuration for SMS providers
-- Supports Infobip as primary with Twilio as fallback option

-- Create SMS provider settings table
CREATE TABLE public.sms_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider configuration
  primary_provider TEXT NOT NULL DEFAULT 'infobip' CHECK (primary_provider IN ('infobip', 'twilio')),
  enable_fallback BOOLEAN DEFAULT true,
  
  -- Infobip configuration
  infobip_enabled BOOLEAN DEFAULT true,
  infobip_base_url TEXT DEFAULT 'https://api.infobip.com',
  infobip_api_key_name TEXT DEFAULT 'INFOBIP_API_KEY', -- References secret name in Supabase
  infobip_sender_id TEXT, -- Sender ID or phone number for Infobip
  
  -- Twilio configuration (backup)
  twilio_enabled BOOLEAN DEFAULT true,
  twilio_account_sid_name TEXT DEFAULT 'TWILIO_ACCOUNT_SID',
  twilio_auth_token_name TEXT DEFAULT 'TWILIO_AUTH_TOKEN',
  twilio_from_number_name TEXT DEFAULT 'TWILIO_FROM_NUMBER',
  
  -- Fallback behavior
  fallback_on_error BOOLEAN DEFAULT true, -- Auto-fallback when primary fails
  log_all_attempts BOOLEAN DEFAULT true, -- Log attempts from both providers
  
  -- Rate limiting (optional)
  max_messages_per_minute INTEGER DEFAULT 100,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by_user_id UUID REFERENCES auth.users(id),
  
  -- Ensure only one global settings row exists
  CONSTRAINT single_settings_row CHECK (id IS NOT NULL)
);

-- Create unique constraint to ensure only one row
CREATE UNIQUE INDEX idx_sms_provider_settings_single ON public.sms_provider_settings ((true));

-- Enable RLS
ALTER TABLE public.sms_provider_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can view SMS provider settings"
  ON public.sms_provider_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update SMS provider settings"
  ON public.sms_provider_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert SMS provider settings"
  ON public.sms_provider_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role can always access (for edge functions)
CREATE POLICY "Service role can access SMS provider settings"
  ON public.sms_provider_settings
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_sms_provider_settings_updated_at
  BEFORE UPDATE ON public.sms_provider_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings (Infobip as primary, Twilio as fallback)
INSERT INTO public.sms_provider_settings (
  primary_provider,
  enable_fallback,
  infobip_enabled,
  twilio_enabled,
  fallback_on_error
) VALUES (
  'infobip',
  true,
  true,
  true,
  true
);

-- ============================================================
-- Add provider_used column to SMS log tables
-- ============================================================

-- Add to sms_delivery_log
ALTER TABLE public.sms_delivery_log 
ADD COLUMN IF NOT EXISTS provider_used TEXT CHECK (provider_used IN ('infobip', 'twilio'));

-- Add to sms_opt_in_log
ALTER TABLE public.sms_opt_in_log 
ADD COLUMN IF NOT EXISTS provider_used TEXT CHECK (provider_used IN ('infobip', 'twilio'));

-- Create index for provider-based queries
CREATE INDEX IF NOT EXISTS idx_sms_delivery_log_provider ON public.sms_delivery_log(provider_used);
CREATE INDEX IF NOT EXISTS idx_sms_opt_in_log_provider ON public.sms_opt_in_log(provider_used);

-- ============================================================
-- Helper Functions for Admin Settings Management
-- ============================================================

-- Function to get current SMS provider settings
CREATE OR REPLACE FUNCTION get_sms_provider_settings()
RETURNS TABLE (
  primary_provider TEXT,
  enable_fallback BOOLEAN,
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

-- Function to update SMS provider settings
CREATE OR REPLACE FUNCTION update_sms_provider_settings(
  p_primary_provider TEXT DEFAULT NULL,
  p_enable_fallback BOOLEAN DEFAULT NULL,
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
  
  -- Update only provided fields
  UPDATE sms_provider_settings
  SET
    primary_provider = COALESCE(p_primary_provider, primary_provider),
    enable_fallback = COALESCE(p_enable_fallback, enable_fallback),
    infobip_enabled = COALESCE(p_infobip_enabled, infobip_enabled),
    infobip_base_url = COALESCE(p_infobip_base_url, infobip_base_url),
    infobip_sender_id = COALESCE(p_infobip_sender_id, infobip_sender_id),
    twilio_enabled = COALESCE(p_twilio_enabled, twilio_enabled),
    fallback_on_error = COALESCE(p_fallback_on_error, fallback_on_error),
    updated_by_user_id = auth.uid()
  WHERE id = v_settings_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_sms_provider_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION update_sms_provider_settings(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

-- ============================================================
-- Comments for documentation
-- ============================================================

COMMENT ON TABLE public.sms_provider_settings IS 'Global SMS provider configuration. Supports Infobip as primary with Twilio fallback.';
COMMENT ON COLUMN public.sms_provider_settings.primary_provider IS 'Primary SMS provider: infobip or twilio';
COMMENT ON COLUMN public.sms_provider_settings.enable_fallback IS 'Whether to try backup provider if primary fails';
COMMENT ON COLUMN public.sms_provider_settings.infobip_sender_id IS 'Sender ID or phone number for Infobip messages';
COMMENT ON COLUMN public.sms_provider_settings.fallback_on_error IS 'Automatically switch to fallback provider on errors';

