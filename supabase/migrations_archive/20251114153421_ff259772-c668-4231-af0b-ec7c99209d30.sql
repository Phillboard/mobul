-- Create gift card pools table
CREATE TABLE IF NOT EXISTS public.gift_card_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pool_name TEXT NOT NULL,
  card_value DECIMAL(10,2) NOT NULL,
  provider TEXT,
  total_cards INTEGER DEFAULT 0,
  available_cards INTEGER DEFAULT 0,
  claimed_cards INTEGER DEFAULT 0,
  delivered_cards INTEGER DEFAULT 0,
  failed_cards INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create gift cards table
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.gift_card_pools(id) ON DELETE CASCADE,
  card_code TEXT NOT NULL,
  card_number TEXT,
  expiration_date DATE,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'delivered', 'failed', 'expired')),
  claimed_at TIMESTAMPTZ,
  claimed_by_recipient_id UUID REFERENCES public.recipients(id),
  claimed_by_call_session_id UUID,
  delivered_at TIMESTAMPTZ,
  delivery_method TEXT CHECK (delivery_method IN ('sms', 'email')),
  delivery_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(card_code)
);

-- Create gift card deliveries audit table
CREATE TABLE IF NOT EXISTS public.gift_card_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id),
  recipient_id UUID NOT NULL REFERENCES public.recipients(id),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id),
  call_session_id UUID,
  condition_number INTEGER NOT NULL CHECK (condition_number IN (1, 2, 3)),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('sms', 'email')),
  delivery_address TEXT NOT NULL,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'bounced')),
  twilio_message_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create campaign reward configs table
CREATE TABLE IF NOT EXISTS public.campaign_reward_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  condition_number INTEGER NOT NULL CHECK (condition_number IN (1, 2, 3)),
  gift_card_pool_id UUID REFERENCES public.gift_card_pools(id),
  reward_description TEXT,
  sms_template TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, condition_number)
);

-- Enable RLS on all tables
ALTER TABLE public.gift_card_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_reward_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gift_card_pools
CREATE POLICY "Users can view their client's pools"
  ON public.gift_card_pools FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Admins can manage pools"
  ON public.gift_card_pools FOR ALL
  USING (
    user_can_access_client(auth.uid(), client_id) AND 
    (has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'agency_admin'))
  );

-- RLS Policies for gift_cards
CREATE POLICY "Users can view cards in their client's pools"
  ON public.gift_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gift_card_pools gcp
      WHERE gcp.id = gift_cards.pool_id
        AND user_can_access_client(auth.uid(), gcp.client_id)
    )
  );

CREATE POLICY "Admins can manage gift cards"
  ON public.gift_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gift_card_pools gcp
      WHERE gcp.id = gift_cards.pool_id
        AND user_can_access_client(auth.uid(), gcp.client_id)
        AND (has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'agency_admin'))
    )
  );

-- RLS Policies for gift_card_deliveries
CREATE POLICY "Users can view deliveries for their campaigns"
  ON public.gift_card_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = gift_card_deliveries.campaign_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "System can create deliveries"
  ON public.gift_card_deliveries FOR INSERT
  WITH CHECK (true);

-- RLS Policies for campaign_reward_configs
CREATE POLICY "Users can view reward configs for their campaigns"
  ON public.campaign_reward_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_reward_configs.campaign_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Admins can manage reward configs"
  ON public.campaign_reward_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_reward_configs.campaign_id
        AND user_can_access_client(auth.uid(), c.client_id)
        AND (has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'agency_admin'))
    )
  );

-- Create trigger for updated_at on gift_card_pools
CREATE TRIGGER update_gift_card_pools_updated_at
  BEFORE UPDATE ON public.gift_card_pools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create atomic gift card claiming function
CREATE OR REPLACE FUNCTION public.claim_available_card(
  p_pool_id UUID,
  p_recipient_id UUID,
  p_call_session_id UUID DEFAULT NULL
)
RETURNS TABLE (
  card_id UUID,
  card_code TEXT,
  card_number TEXT,
  card_value DECIMAL,
  provider TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Lock and claim the first available card atomically
  UPDATE gift_cards
  SET 
    status = 'claimed',
    claimed_at = NOW(),
    claimed_by_recipient_id = p_recipient_id,
    claimed_by_call_session_id = p_call_session_id
  WHERE id = (
    SELECT id FROM gift_cards
    WHERE pool_id = p_pool_id
      AND status = 'available'
      AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_card_id;
  
  -- If no card was claimed, raise exception
  IF v_card_id IS NULL THEN
    RAISE EXCEPTION 'No available gift cards in pool';
  END IF;
  
  -- Update pool statistics
  UPDATE gift_card_pools
  SET 
    available_cards = available_cards - 1,
    claimed_cards = claimed_cards + 1,
    updated_at = NOW()
  WHERE id = p_pool_id;
  
  -- Return the claimed card details
  RETURN QUERY
  SELECT 
    gc.id,
    gc.card_code,
    gc.card_number,
    gcp.card_value,
    gcp.provider
  FROM gift_cards gc
  JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
  WHERE gc.id = v_card_id;
END;
$$;