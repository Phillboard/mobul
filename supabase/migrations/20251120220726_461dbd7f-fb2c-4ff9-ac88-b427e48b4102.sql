-- Create gift card brands table
CREATE TABLE IF NOT EXISTS public.gift_card_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL UNIQUE,
  brand_code TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'tillo',
  logo_url TEXT,
  category TEXT,
  typical_denominations JSONB DEFAULT '[]'::jsonb,
  balance_check_enabled BOOLEAN DEFAULT true,
  balance_check_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add balance tracking to gift_cards
ALTER TABLE public.gift_cards
ADD COLUMN IF NOT EXISTS current_balance NUMERIC,
ADD COLUMN IF NOT EXISTS last_balance_check TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS balance_check_status TEXT DEFAULT 'unchecked',
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.gift_card_brands(id);

-- Create gift card sales/purchases table
CREATE TABLE IF NOT EXISTS public.gift_card_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  pool_id UUID REFERENCES public.gift_card_pools(id) NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_card NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  sold_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Add balance change tracking
CREATE TABLE IF NOT EXISTS public.gift_card_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID REFERENCES public.gift_cards(id) ON DELETE CASCADE NOT NULL,
  previous_balance NUMERIC,
  new_balance NUMERIC,
  change_amount NUMERIC,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  check_method TEXT DEFAULT 'api',
  status TEXT,
  error_message TEXT
);

-- Insert the 5 gift card brands
INSERT INTO public.gift_card_brands (brand_name, brand_code, provider, category, typical_denominations, logo_url) VALUES
('Starbucks', 'starbucks', 'tillo', 'food_beverage', '[5, 10, 15, 25, 50, 100]', 'https://logo.clearbit.com/starbucks.com'),
('Dominos', 'dominos', 'tillo', 'food_beverage', '[10, 25, 50]', 'https://logo.clearbit.com/dominos.com'),
('Jimmy Johns', 'jimmyjohns', 'tillo', 'food_beverage', '[10, 25, 50]', 'https://logo.clearbit.com/jimmyjohns.com'),
('Pizza Hut', 'pizzahut', 'tillo', 'food_beverage', '[10, 25, 50]', 'https://logo.clearbit.com/pizzahut.com'),
('Dunkin Donuts', 'dunkin', 'tillo', 'food_beverage', '[5, 10, 15, 25, 50]', 'https://logo.clearbit.com/dunkindonuts.com')
ON CONFLICT (brand_code) DO NOTHING;

-- RLS Policies
ALTER TABLE public.gift_card_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_balance_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view brands
CREATE POLICY "Anyone can view gift card brands"
ON public.gift_card_brands FOR SELECT
TO authenticated
USING (true);

-- Admins can manage brands
CREATE POLICY "Admins can manage brands"
ON public.gift_card_brands FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view sales for their clients
CREATE POLICY "Users can view sales for their clients"
ON public.gift_card_sales FOR SELECT
TO authenticated
USING (user_can_access_client(auth.uid(), client_id));

-- Admins can create sales
CREATE POLICY "Admins can create sales"
ON public.gift_card_sales FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view balance history for their cards
CREATE POLICY "Users can view balance history"
ON public.gift_card_balance_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gift_cards gc
    JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
    WHERE gc.id = gift_card_balance_history.gift_card_id
    AND user_can_access_client(auth.uid(), gcp.client_id)
  )
);

-- System can insert balance history
CREATE POLICY "System can create balance history"
ON public.gift_card_balance_history FOR INSERT
TO authenticated
WITH CHECK (true);