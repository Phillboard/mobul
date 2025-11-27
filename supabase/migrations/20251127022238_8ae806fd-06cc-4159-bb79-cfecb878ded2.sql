-- Create call_center_scripts table for manager-editable scripts
CREATE TABLE IF NOT EXISTS public.call_center_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  script_name TEXT NOT NULL,
  script_type TEXT NOT NULL CHECK (script_type IN ('greeting', 'verification', 'explanation', 'objection_handling', 'closing', 'escalation')),
  script_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent_performance_metrics table for tracking agent stats
CREATE TABLE IF NOT EXISTS public.agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  redemptions_count INTEGER NOT NULL DEFAULT 0,
  calls_handled INTEGER NOT NULL DEFAULT 0,
  avg_call_duration_seconds INTEGER,
  successful_redemptions INTEGER NOT NULL DEFAULT 0,
  failed_redemptions INTEGER NOT NULL DEFAULT 0,
  quality_score NUMERIC(3,2),
  customer_satisfaction_avg NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_user_id, date)
);

-- Create call_dispositions table for tracking call outcomes
CREATE TABLE IF NOT EXISTS public.call_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.recipients(id) ON DELETE SET NULL,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id),
  disposition_type TEXT NOT NULL CHECK (disposition_type IN ('completed', 'callback_requested', 'wrong_number', 'no_answer', 'voicemail', 'escalated', 'customer_declined')),
  notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recipient_enrichment_log table for tracking data updates by agents
CREATE TABLE IF NOT EXISTS public.recipient_enrichment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id),
  field_updated TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  enrichment_source TEXT NOT NULL DEFAULT 'call_center' CHECK (enrichment_source IN ('call_center', 'manual_entry', 'verified', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add custom_fields and enrichment tracking to recipients table
ALTER TABLE public.recipients 
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enriched_by_user_id UUID REFERENCES auth.users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_center_scripts_client_id ON public.call_center_scripts(client_id);
CREATE INDEX IF NOT EXISTS idx_call_center_scripts_campaign_id ON public.call_center_scripts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_date ON public.agent_performance_metrics(agent_user_id, date);
CREATE INDEX IF NOT EXISTS idx_call_dispositions_agent_user ON public.call_dispositions(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_recipient_enrichment_log_recipient ON public.recipient_enrichment_log(recipient_id);
CREATE INDEX IF NOT EXISTS idx_recipient_enrichment_log_agent ON public.recipient_enrichment_log(agent_user_id);

-- Enable RLS
ALTER TABLE public.call_center_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipient_enrichment_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_center_scripts
CREATE POLICY "Users can view scripts for accessible clients"
  ON public.call_center_scripts FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can manage scripts for accessible clients"
  ON public.call_center_scripts FOR ALL
  USING (user_can_access_client(auth.uid(), client_id));

-- RLS Policies for agent_performance_metrics
CREATE POLICY "Agents can view their own metrics"
  ON public.agent_performance_metrics FOR SELECT
  USING (auth.uid() = agent_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert/update metrics"
  ON public.agent_performance_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for call_dispositions
CREATE POLICY "Users can view dispositions for accessible campaigns"
  ON public.call_dispositions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.call_sessions cs
      JOIN public.campaigns c ON c.id = cs.campaign_id
      WHERE cs.id = call_dispositions.call_session_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Agents can create dispositions"
  ON public.call_dispositions FOR INSERT
  WITH CHECK (auth.uid() = agent_user_id);

-- RLS Policies for recipient_enrichment_log
CREATE POLICY "Users can view enrichment logs for accessible recipients"
  ON public.recipient_enrichment_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipients r
      JOIN public.audiences a ON a.id = r.audience_id
      WHERE r.id = recipient_enrichment_log.recipient_id
      AND user_can_access_client(auth.uid(), a.client_id)
    )
  );

CREATE POLICY "Agents can create enrichment logs"
  ON public.recipient_enrichment_log FOR INSERT
  WITH CHECK (auth.uid() = agent_user_id);