-- Enable nullable client_id for admin-owned master pools
ALTER TABLE gift_card_pools 
  ALTER COLUMN client_id DROP NOT NULL;

-- Add marketplace-specific fields to gift_card_pools (skip available_for_purchase as it exists)
ALTER TABLE gift_card_pools
  ADD COLUMN IF NOT EXISTS is_master_pool BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_price_per_card NUMERIC,
  ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS min_purchase_quantity INTEGER DEFAULT 1;

-- Track admin purchases and inventory
CREATE TABLE IF NOT EXISTS admin_gift_card_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  brand_id UUID REFERENCES gift_card_brands(id),
  quantity INTEGER NOT NULL,
  cost_per_card NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  supplier_name TEXT,
  supplier_reference TEXT,
  notes TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track sales from admin to clients
CREATE TABLE IF NOT EXISTS admin_card_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  master_pool_id UUID REFERENCES gift_card_pools(id),
  buyer_client_id UUID REFERENCES clients(id),
  buyer_pool_id UUID REFERENCES gift_card_pools(id),
  quantity INTEGER NOT NULL,
  price_per_card NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  cost_per_card NUMERIC,
  profit NUMERIC,
  sold_by_user_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE admin_gift_card_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_card_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_gift_card_inventory
DROP POLICY IF EXISTS "Admins manage inventory" ON admin_gift_card_inventory;
CREATE POLICY "Admins manage inventory"
  ON admin_gift_card_inventory
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for admin_card_sales
DROP POLICY IF EXISTS "Admins view all sales" ON admin_card_sales;
DROP POLICY IF EXISTS "Clients view their purchases" ON admin_card_sales;
DROP POLICY IF EXISTS "Admins insert sales" ON admin_card_sales;

CREATE POLICY "Admins view all sales"
  ON admin_card_sales
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view their purchases"
  ON admin_card_sales
  FOR SELECT
  USING (user_can_access_client(auth.uid(), buyer_client_id));

CREATE POLICY "Admins insert sales"
  ON admin_card_sales
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update gift_card_pools policy to handle master pools
DROP POLICY IF EXISTS "Users can view their client's pools" ON gift_card_pools;

CREATE POLICY "Users can view their client's pools"
  ON gift_card_pools
  FOR SELECT
  USING (
    (client_id IS NOT NULL AND user_can_access_client(auth.uid(), client_id))
    OR 
    (is_master_pool = true AND has_role(auth.uid(), 'admin'::app_role))
    OR
    (available_for_purchase = true)
  );

DROP POLICY IF EXISTS "Admins can manage master pools" ON gift_card_pools;
CREATE POLICY "Admins can manage master pools"
  ON gift_card_pools
  FOR ALL
  USING (
    (is_master_pool = true AND has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    (is_master_pool = true AND has_role(auth.uid(), 'admin'::app_role))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_is_master ON gift_card_pools(is_master_pool);
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_available_purchase ON gift_card_pools(available_for_purchase);
CREATE INDEX IF NOT EXISTS idx_admin_card_sales_buyer ON admin_card_sales(buyer_client_id);
CREATE INDEX IF NOT EXISTS idx_admin_card_sales_master_pool ON admin_card_sales(master_pool_id);