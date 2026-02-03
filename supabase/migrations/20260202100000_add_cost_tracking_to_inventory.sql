-- Migration: Add cost tracking to gift_card_inventory
-- Purpose: Track per-card costs for profit calculation

-- Add cost tracking columns to gift_card_inventory
ALTER TABLE gift_card_inventory
ADD COLUMN IF NOT EXISTS cost_per_card numeric(10,2),
ADD COLUMN IF NOT EXISTS cost_source text CHECK (cost_source IN ('csv', 'tillo_api', 'manual', 'unknown')),
ADD COLUMN IF NOT EXISTS upload_batch_id uuid;

-- Add index for batch lookups
CREATE INDEX IF NOT EXISTS idx_gift_card_inventory_upload_batch 
ON gift_card_inventory(upload_batch_id) 
WHERE upload_batch_id IS NOT NULL;

-- Add index for cost analysis
CREATE INDEX IF NOT EXISTS idx_gift_card_inventory_cost_source 
ON gift_card_inventory(cost_source) 
WHERE cost_source IS NOT NULL;

-- Create upload_batches table for tracking import batches
CREATE TABLE IF NOT EXISTS gift_card_upload_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_user_id uuid REFERENCES auth.users(id),
  brand_id uuid REFERENCES gift_card_brands(id),
  denomination numeric(10,2),
  total_cards integer NOT NULL DEFAULT 0,
  total_cost numeric(12,2),
  average_cost_per_card numeric(10,2),
  source text NOT NULL DEFAULT 'csv',
  filename text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on upload_batches
ALTER TABLE gift_card_upload_batches ENABLE ROW LEVEL SECURITY;

-- Admin-only access for upload batches
CREATE POLICY "Admins can manage upload batches" ON gift_card_upload_batches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN gift_card_inventory.cost_per_card IS 'Actual cost paid for this card (from CSV import or Tillo API)';
COMMENT ON COLUMN gift_card_inventory.cost_source IS 'Source of the card: csv (uploaded), tillo_api (purchased), manual (entered), unknown';
COMMENT ON COLUMN gift_card_inventory.upload_batch_id IS 'Reference to the import batch for tracking purposes';

-- Create a function to calculate profit for a card
CREATE OR REPLACE FUNCTION calculate_card_profit(
  p_card_id uuid
)
RETURNS TABLE (
  face_value numeric,
  cost numeric,
  sell_price numeric,
  profit numeric,
  margin_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card RECORD;
  v_billing RECORD;
BEGIN
  -- Get card details
  SELECT 
    gci.denomination,
    gci.cost_per_card,
    gci.brand_id
  INTO v_card
  FROM gift_card_inventory gci
  WHERE gci.id = p_card_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get billing info if card was sold
  SELECT 
    gcbl.amount_billed,
    gcbl.cost_basis
  INTO v_billing
  FROM gift_card_billing_ledger gcbl
  WHERE gcbl.inventory_card_id = p_card_id
  LIMIT 1;
  
  -- Calculate values
  face_value := v_card.denomination;
  cost := COALESCE(v_card.cost_per_card, v_billing.cost_basis, v_card.denomination * 0.95);
  sell_price := COALESCE(v_billing.amount_billed, v_card.denomination);
  profit := sell_price - cost;
  margin_percentage := CASE WHEN cost > 0 THEN ((sell_price - cost) / cost) * 100 ELSE 0 END;
  
  RETURN NEXT;
END;
$$;

-- Create view for inventory with cost analysis
CREATE OR REPLACE VIEW gift_card_inventory_with_costs AS
SELECT 
  gci.*,
  gcb.brand_name,
  gcb.logo_url as brand_logo,
  gub.filename as import_filename,
  gub.created_at as batch_uploaded_at,
  COALESCE(gci.cost_per_card, gcd.cost_basis, gci.denomination * 0.95) as effective_cost,
  gci.denomination - COALESCE(gci.cost_per_card, gcd.cost_basis, gci.denomination * 0.95) as potential_profit
FROM gift_card_inventory gci
LEFT JOIN gift_card_brands gcb ON gci.brand_id = gcb.id
LEFT JOIN gift_card_upload_batches gub ON gci.upload_batch_id = gub.id
LEFT JOIN gift_card_denominations gcd ON gci.brand_id = gcd.brand_id AND gci.denomination = gcd.denomination;

-- Grant access to view
GRANT SELECT ON gift_card_inventory_with_costs TO authenticated;
