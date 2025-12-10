-- Phase 1: User Table Preferences
CREATE TABLE IF NOT EXISTS public.user_table_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  visible_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_widths JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, table_name)
);

CREATE INDEX idx_user_table_preferences_user_id ON public.user_table_preferences(user_id);

ALTER TABLE public.user_table_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own table preferences"
  ON public.user_table_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Phase 2: Contact Campaign Participation
CREATE TABLE IF NOT EXISTS public.contact_campaign_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.recipients(id) ON DELETE SET NULL,
  participation_status TEXT NOT NULL DEFAULT 'sent',
  redemption_code TEXT,
  participated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  gift_card_id UUID REFERENCES public.gift_cards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, campaign_id)
);

CREATE INDEX idx_contact_campaign_participation_contact_id ON public.contact_campaign_participation(contact_id);
CREATE INDEX idx_contact_campaign_participation_campaign_id ON public.contact_campaign_participation(campaign_id);
CREATE INDEX idx_contact_campaign_participation_recipient_id ON public.contact_campaign_participation(recipient_id);

ALTER TABLE public.contact_campaign_participation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaign participation for accessible contacts"
  ON public.contact_campaign_participation
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_campaign_participation.contact_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Users can manage campaign participation for accessible contacts"
  ON public.contact_campaign_participation
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_campaign_participation.contact_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- Backfill existing recipient data into contact_campaign_participation
INSERT INTO public.contact_campaign_participation (
  contact_id,
  campaign_id,
  recipient_id,
  participation_status,
  redemption_code,
  participated_at,
  redeemed_at,
  gift_card_id
)
SELECT DISTINCT
  r.contact_id,
  c.id as campaign_id,
  r.id as recipient_id,
  CASE 
    WHEN r.redemption_completed_at IS NOT NULL THEN 'redeemed'
    WHEN r.approval_status = 'approved' THEN 'delivered'
    ELSE 'sent'
  END as participation_status,
  r.redemption_code,
  r.created_at as participated_at,
  r.redemption_completed_at,
  r.gift_card_assigned_id
FROM public.recipients r
INNER JOIN public.audiences a ON a.id = r.audience_id
INNER JOIN public.campaigns c ON c.audience_id = a.id
WHERE r.contact_id IS NOT NULL
ON CONFLICT (contact_id, campaign_id) DO NOTHING;

-- Trigger to auto-sync recipient changes to participation
CREATE OR REPLACE FUNCTION sync_recipient_to_participation()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  -- Only process if recipient has a contact_id
  IF NEW.contact_id IS NOT NULL THEN
    -- Get campaign_id from audience
    SELECT c.id INTO v_campaign_id
    FROM public.audiences a
    INNER JOIN public.campaigns c ON c.audience_id = a.id
    WHERE a.id = NEW.audience_id
    LIMIT 1;
    
    IF v_campaign_id IS NOT NULL THEN
      INSERT INTO public.contact_campaign_participation (
        contact_id,
        campaign_id,
        recipient_id,
        participation_status,
        redemption_code,
        participated_at,
        delivered_at,
        redeemed_at,
        gift_card_id
      )
      VALUES (
        NEW.contact_id,
        v_campaign_id,
        NEW.id,
        CASE 
          WHEN NEW.redemption_completed_at IS NOT NULL THEN 'redeemed'
          WHEN NEW.approval_status = 'approved' THEN 'delivered'
          ELSE 'sent'
        END,
        NEW.redemption_code,
        NEW.created_at,
        NEW.approved_at,
        NEW.redemption_completed_at,
        NEW.gift_card_assigned_id
      )
      ON CONFLICT (contact_id, campaign_id) 
      DO UPDATE SET
        participation_status = CASE 
          WHEN NEW.redemption_completed_at IS NOT NULL THEN 'redeemed'
          WHEN NEW.approval_status = 'approved' THEN 'delivered'
          ELSE 'sent'
        END,
        delivered_at = NEW.approved_at,
        redeemed_at = NEW.redemption_completed_at,
        gift_card_id = NEW.gift_card_assigned_id,
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER recipient_sync_to_participation
  AFTER INSERT OR UPDATE ON public.recipients
  FOR EACH ROW
  EXECUTE FUNCTION sync_recipient_to_participation();