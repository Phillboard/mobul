-- Bulk operations support for call center

-- Batch code validation table
CREATE TABLE IF NOT EXISTS bulk_code_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  campaign_id UUID REFERENCES campaigns(id),
  file_name TEXT,
  total_codes INTEGER NOT NULL DEFAULT 0,
  valid_codes INTEGER NOT NULL DEFAULT 0,
  invalid_codes INTEGER NOT NULL DEFAULT 0,
  duplicate_codes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  results JSONB DEFAULT '[]',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Batch provisioning queue
CREATE TABLE IF NOT EXISTS bulk_provisioning_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL,
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  condition_id UUID REFERENCES campaign_conditions(id),
  total_recipients INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress_percentage INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_bulk_validations_user ON bulk_code_validations(uploaded_by, created_at DESC);
CREATE INDEX idx_bulk_validations_status ON bulk_code_validations(status, created_at DESC);
CREATE INDEX idx_bulk_provisioning_batch ON bulk_provisioning_queue(batch_id);
CREATE INDEX idx_bulk_provisioning_status ON bulk_provisioning_queue(status, created_at DESC);

-- RLS
ALTER TABLE bulk_code_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_provisioning_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own validations"
  ON bulk_code_validations FOR SELECT
  USING (uploaded_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'call_center')));

CREATE POLICY "Call center can insert validations"
  ON bulk_code_validations FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'call_center'))
  );

CREATE POLICY "Users can view their provisioning jobs"
  ON bulk_provisioning_queue FOR SELECT
  USING (initiated_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'call_center')));

-- Function: Validate batch of redemption codes
CREATE OR REPLACE FUNCTION validate_redemption_codes_batch(
  p_codes TEXT[],
  p_campaign_id UUID DEFAULT NULL
)
RETURNS TABLE (
  code TEXT,
  is_valid BOOLEAN,
  status TEXT,
  recipient_id UUID,
  recipient_name TEXT,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest_code.code,
    CASE 
      WHEN r.id IS NULL THEN FALSE
      WHEN p_campaign_id IS NOT NULL AND c.id != p_campaign_id THEN FALSE
      WHEN r.approval_status = 'redeemed' THEN FALSE
      ELSE TRUE
    END as is_valid,
    COALESCE(r.approval_status, 'not_found') as status,
    r.id as recipient_id,
    CONCAT(r.first_name, ' ', r.last_name) as recipient_name,
    CASE
      WHEN r.id IS NULL THEN 'Code not found'
      WHEN p_campaign_id IS NOT NULL AND c.id != p_campaign_id THEN 'Code belongs to different campaign'
      WHEN r.approval_status = 'redeemed' THEN 'Already redeemed'
      WHEN r.approval_status = 'rejected' THEN 'Code has been rejected'
      ELSE NULL
    END as error_message
  FROM unnest(p_codes) as unnest_code(code)
  LEFT JOIN recipients r ON UPPER(TRIM(r.redemption_code)) = UPPER(TRIM(unnest_code.code))
  LEFT JOIN audiences a ON a.id = r.audience_id
  LEFT JOIN campaigns c ON c.audience_id = a.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get bulk operations status
CREATE OR REPLACE FUNCTION get_bulk_operations_summary(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  validation_jobs_pending INTEGER,
  validation_jobs_completed_today INTEGER,
  provisioning_jobs_active INTEGER,
  provisioning_jobs_completed_today INTEGER,
  total_provisioned_today INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM bulk_code_validations 
     WHERE status = 'processing' AND (p_user_id IS NULL OR uploaded_by = p_user_id)),
    (SELECT COUNT(*)::INTEGER FROM bulk_code_validations 
     WHERE status = 'completed' AND created_at >= CURRENT_DATE AND (p_user_id IS NULL OR uploaded_by = p_user_id)),
    (SELECT COUNT(*)::INTEGER FROM bulk_provisioning_queue 
     WHERE status IN ('queued', 'processing') AND (p_user_id IS NULL OR initiated_by = p_user_id)),
    (SELECT COUNT(*)::INTEGER FROM bulk_provisioning_queue 
     WHERE status = 'completed' AND created_at >= CURRENT_DATE AND (p_user_id IS NULL OR initiated_by = p_user_id)),
    (SELECT COALESCE(SUM(success_count), 0)::INTEGER FROM bulk_provisioning_queue 
     WHERE status = 'completed' AND created_at >= CURRENT_DATE AND (p_user_id IS NULL OR initiated_by = p_user_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Export redeemed codes
CREATE OR REPLACE FUNCTION export_redeemed_codes(
  p_campaign_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  redemption_code TEXT,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  redeemed_at TIMESTAMPTZ,
  gift_card_brand TEXT,
  gift_card_value NUMERIC,
  gift_card_code TEXT,
  redeemed_by_agent TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.redemption_code,
    CONCAT(r.first_name, ' ', r.last_name) as recipient_name,
    r.phone as recipient_phone,
    r.email as recipient_email,
    r.gift_card_claimed_at as redeemed_at,
    gcb.brand_name as gift_card_brand,
    gcp.card_value as gift_card_value,
    gc.card_code as gift_card_code,
    au.email as redeemed_by_agent
  FROM recipients r
  JOIN audiences a ON a.id = r.audience_id
  JOIN campaigns c ON c.audience_id = a.id
  LEFT JOIN gift_cards gc ON gc.id = r.gift_card_assigned_id
  LEFT JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
  LEFT JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  LEFT JOIN auth.users au ON au.id = r.approved_by_user_id
  WHERE c.id = p_campaign_id
    AND r.approval_status = 'redeemed'
    AND (p_start_date IS NULL OR r.gift_card_claimed_at >= p_start_date)
    AND (p_end_date IS NULL OR r.gift_card_claimed_at <= p_end_date)
  ORDER BY r.gift_card_claimed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE bulk_code_validations IS 'Tracks CSV bulk code validation jobs';
COMMENT ON TABLE bulk_provisioning_queue IS 'Queue for batch gift card provisioning operations';
COMMENT ON FUNCTION validate_redemption_codes_batch IS 'Validates an array of redemption codes';
COMMENT ON FUNCTION get_bulk_operations_summary IS 'Gets summary of bulk operations for dashboard';
COMMENT ON FUNCTION export_redeemed_codes IS 'Exports redeemed codes for reporting';

GRANT EXECUTE ON FUNCTION validate_redemption_codes_batch TO authenticated;
GRANT EXECUTE ON FUNCTION get_bulk_operations_summary TO authenticated;
GRANT EXECUTE ON FUNCTION export_redeemed_codes TO authenticated;

