-- ============================================================================
-- Migration: Add Redemption Workflow Log
-- ============================================================================
-- 
-- Purpose: Track every step of the call center redemption workflow with
-- detailed request/response payloads for debugging and auditing.
--
-- Date: 2026-01-27
-- ============================================================================

-- Create the redemption workflow log table
CREATE TABLE IF NOT EXISTS public.redemption_workflow_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session tracking (groups all steps in one redemption attempt)
  session_id UUID NOT NULL,
  call_session_id UUID REFERENCES public.call_sessions(id) ON DELETE SET NULL,
  
  -- Context
  recipient_id UUID REFERENCES public.recipients(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  agent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redemption_code TEXT,
  
  -- Step details
  step_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  
  -- Detailed data
  request_payload JSONB DEFAULT '{}'::jsonb,
  response_payload JSONB DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_message TEXT,
  error_stack TEXT,
  
  -- Timing
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT redemption_workflow_log_step_name_check CHECK (
    step_name = ANY (ARRAY[
      'code_lookup'::text,
      'campaign_select'::text,
      'sms_opt_in'::text,
      'sms_response'::text,
      'condition_select'::text,
      'provision'::text,
      'verification_skip'::text,
      'email_verification'::text
    ])
  ),
  CONSTRAINT redemption_workflow_log_status_check CHECK (
    status = ANY (ARRAY[
      'started'::text,
      'success'::text,
      'failed'::text,
      'skipped'::text
    ])
  )
);

-- Set table owner
ALTER TABLE public.redemption_workflow_log OWNER TO postgres;

-- Add comment
COMMENT ON TABLE public.redemption_workflow_log IS 'Tracks every step of the call center redemption workflow for debugging and auditing';

-- Create indexes for efficient querying
CREATE INDEX idx_redemption_workflow_log_session ON public.redemption_workflow_log(session_id);
CREATE INDEX idx_redemption_workflow_log_created ON public.redemption_workflow_log(created_at DESC);
CREATE INDEX idx_redemption_workflow_log_agent ON public.redemption_workflow_log(agent_user_id);
CREATE INDEX idx_redemption_workflow_log_campaign ON public.redemption_workflow_log(campaign_id);
CREATE INDEX idx_redemption_workflow_log_recipient ON public.redemption_workflow_log(recipient_id);
CREATE INDEX idx_redemption_workflow_log_status ON public.redemption_workflow_log(status);
CREATE INDEX idx_redemption_workflow_log_step ON public.redemption_workflow_log(step_name);
CREATE INDEX idx_redemption_workflow_log_code ON public.redemption_workflow_log(redemption_code);

-- Enable Row Level Security
ALTER TABLE public.redemption_workflow_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all logs
CREATE POLICY "Admins can view all redemption workflow logs"
  ON public.redemption_workflow_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Authenticated users can insert logs (the hook will handle authorization)
CREATE POLICY "Authenticated users can insert redemption workflow logs"
  ON public.redemption_workflow_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role has full access (for edge functions)
CREATE POLICY "Service role has full access to redemption workflow logs"
  ON public.redemption_workflow_log
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON TABLE public.redemption_workflow_log TO authenticated;
GRANT ALL ON TABLE public.redemption_workflow_log TO service_role;
