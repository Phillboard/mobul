-- Create tracked_phone_numbers table
CREATE TABLE public.tracked_phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  twilio_sid TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'decommissioned')),
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create call_sessions table
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.recipients(id) ON DELETE SET NULL,
  tracked_number_id UUID NOT NULL REFERENCES public.tracked_phone_numbers(id) ON DELETE CASCADE,
  caller_phone TEXT NOT NULL,
  twilio_call_sid TEXT,
  call_status TEXT NOT NULL DEFAULT 'ringing' CHECK (call_status IN ('ringing', 'in-progress', 'completed', 'no-answer', 'busy', 'failed')),
  match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('matched', 'unmatched', 'manual_override')),
  agent_user_id UUID,
  call_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  call_answered_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  call_duration_seconds INTEGER,
  recording_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create call_conditions_met table
CREATE TABLE public.call_conditions_met (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
  condition_number INTEGER NOT NULL CHECK (condition_number IN (1, 2, 3)),
  met_by_agent_id UUID,
  met_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gift_card_id UUID REFERENCES public.gift_cards(id) ON DELETE SET NULL,
  delivery_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(call_session_id, condition_number)
);

-- Create campaign_conditions table
CREATE TABLE public.campaign_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  condition_number INTEGER NOT NULL CHECK (condition_number IN (1, 2, 3)),
  condition_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual_agent' CHECK (trigger_type IN ('manual_agent', 'crm_webhook', 'time_delay')),
  crm_event_name TEXT,
  time_delay_hours INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, condition_number)
);

-- Enable RLS
ALTER TABLE public.tracked_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_conditions_met ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_conditions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracked_phone_numbers
CREATE POLICY "Users can view tracked numbers for accessible clients"
  ON public.tracked_phone_numbers FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Admins can manage tracked numbers"
  ON public.tracked_phone_numbers FOR ALL
  USING (
    user_can_access_client(auth.uid(), client_id) AND
    (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'agency_admin'::app_role))
  );

-- RLS Policies for call_sessions
CREATE POLICY "Users can view call sessions for accessible campaigns"
  ON public.call_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = call_sessions.campaign_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Users can create call sessions for accessible campaigns"
  ON public.call_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = call_sessions.campaign_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Users can update call sessions for accessible campaigns"
  ON public.call_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = call_sessions.campaign_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Public can create call sessions"
  ON public.call_sessions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for call_conditions_met
CREATE POLICY "Users can view conditions for accessible campaigns"
  ON public.call_conditions_met FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = call_conditions_met.campaign_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Users can create conditions for accessible campaigns"
  ON public.call_conditions_met FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = call_conditions_met.campaign_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- RLS Policies for campaign_conditions
CREATE POLICY "Users can view campaign conditions for accessible campaigns"
  ON public.campaign_conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_conditions.campaign_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Users can manage campaign conditions for accessible campaigns"
  ON public.campaign_conditions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_conditions.campaign_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- Enable Realtime for call_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;

-- Create indexes for performance
CREATE INDEX idx_tracked_numbers_client ON public.tracked_phone_numbers(client_id);
CREATE INDEX idx_tracked_numbers_campaign ON public.tracked_phone_numbers(campaign_id);
CREATE INDEX idx_call_sessions_campaign ON public.call_sessions(campaign_id);
CREATE INDEX idx_call_sessions_recipient ON public.call_sessions(recipient_id);
CREATE INDEX idx_call_sessions_caller_phone ON public.call_sessions(caller_phone);
CREATE INDEX idx_call_conditions_campaign ON public.call_conditions_met(campaign_id);
CREATE INDEX idx_campaign_conditions_campaign ON public.campaign_conditions(campaign_id);