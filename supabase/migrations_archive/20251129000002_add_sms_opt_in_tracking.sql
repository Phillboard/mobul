-- SMS Opt-In Tracking for Call Center Flow
-- Enables instant SMS opt-in with real-time status visibility

-- Add SMS opt-in tracking columns to recipients
ALTER TABLE public.recipients 
ADD COLUMN IF NOT EXISTS sms_opt_in_status TEXT 
CHECK (sms_opt_in_status IN ('not_sent', 'pending', 'opted_in', 'opted_out', 'invalid_response')) 
DEFAULT 'not_sent';

ALTER TABLE public.recipients 
ADD COLUMN IF NOT EXISTS sms_opt_in_sent_at TIMESTAMPTZ;

ALTER TABLE public.recipients 
ADD COLUMN IF NOT EXISTS sms_opt_in_response_at TIMESTAMPTZ;

ALTER TABLE public.recipients 
ADD COLUMN IF NOT EXISTS sms_opt_in_response TEXT;

-- Create SMS opt-in log table for audit trail
CREATE TABLE IF NOT EXISTS public.sms_opt_in_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  call_session_id UUID REFERENCES public.call_sessions(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  message_sid TEXT, -- Twilio message SID
  direction TEXT CHECK (direction IN ('outbound', 'inbound')) NOT NULL,
  message_text TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'received')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_sms_opt_in_log_recipient ON public.sms_opt_in_log(recipient_id);
CREATE INDEX IF NOT EXISTS idx_sms_opt_in_log_call_session ON public.sms_opt_in_log(call_session_id);
CREATE INDEX IF NOT EXISTS idx_sms_opt_in_log_phone ON public.sms_opt_in_log(phone);
CREATE INDEX IF NOT EXISTS idx_sms_opt_in_log_created ON public.sms_opt_in_log(created_at DESC);

-- Index on recipients for finding pending opt-ins
CREATE INDEX IF NOT EXISTS idx_recipients_sms_opt_in_status 
ON public.recipients(sms_opt_in_status) 
WHERE sms_opt_in_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_recipients_sms_opt_in_phone 
ON public.recipients(phone, sms_opt_in_status) 
WHERE sms_opt_in_status = 'pending';

-- Enable RLS
ALTER TABLE public.sms_opt_in_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can view SMS logs for accessible campaigns
CREATE POLICY "Users can view SMS logs for accessible campaigns"
ON public.sms_opt_in_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = sms_opt_in_log.campaign_id
    AND user_can_access_client(auth.uid(), c.client_id)
  )
);

-- RLS Policy - Users can insert SMS logs for accessible campaigns
CREATE POLICY "Users can insert SMS logs for accessible campaigns"
ON public.sms_opt_in_log
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = sms_opt_in_log.campaign_id
    AND user_can_access_client(auth.uid(), c.client_id)
  )
);

-- Enable Realtime for sms_opt_in_log (for real-time status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_opt_in_log;

SELECT 'Added SMS opt-in tracking' as status;

