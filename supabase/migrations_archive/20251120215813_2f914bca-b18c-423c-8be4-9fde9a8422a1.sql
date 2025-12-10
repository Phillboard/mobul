-- Add new columns to gift_card_pools for purchase methods and API configuration
ALTER TABLE gift_card_pools
ADD COLUMN IF NOT EXISTS purchase_method TEXT DEFAULT 'csv_only'
  CHECK (purchase_method IN ('csv_only', 'api_only', 'csv_with_fallback')),
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- Add audit logging table
CREATE TABLE IF NOT EXISTS gift_card_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  changes JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE gift_card_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON gift_card_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON gift_card_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_pool_status ON gift_cards(pool_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_card_deliveries_campaign ON gift_card_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_audit_log_entity ON gift_card_audit_log(entity_type, entity_id);

-- Update RLS policies for multi-level pool creation
DROP POLICY IF EXISTS "Users can view their client's pools" ON gift_card_pools;

CREATE POLICY "Users can view their client's pools" ON gift_card_pools
  FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create pools for accessible clients" ON gift_card_pools
  FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update pools for accessible clients" ON gift_card_pools
  FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete pools for accessible clients" ON gift_card_pools
  FOR DELETE
  USING (user_can_access_client(auth.uid(), client_id));