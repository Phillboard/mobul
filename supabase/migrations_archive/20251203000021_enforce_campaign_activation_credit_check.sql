-- =====================================================
-- ENFORCE $100 MINIMUM CREDIT FOR CAMPAIGN ACTIVATION
-- =====================================================
-- This migration creates a trigger that prevents campaign
-- activation when the client has less than $100 in credits.
-- =====================================================

-- =====================================================
-- FUNCTION: Check credit balance before campaign activation
-- =====================================================

CREATE OR REPLACE FUNCTION check_campaign_activation_credit()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_credit_balance NUMERIC(12,2);
  v_minimum_credit NUMERIC(12,2) := 100;  -- $100 minimum
BEGIN
  -- Only check when status is being changed to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Get the client_id from the campaign
    v_client_id := NEW.client_id;
    
    IF v_client_id IS NULL THEN
      -- If no client_id, allow (might be a platform-level campaign)
      RETURN NEW;
    END IF;
    
    -- Get the client's credit balance
    SELECT COALESCE(total_remaining, 0) 
    INTO v_credit_balance
    FROM credit_accounts
    WHERE entity_type = 'client' 
      AND entity_id = v_client_id;
    
    -- If no credit account found, check if client has legacy credits field
    IF v_credit_balance IS NULL THEN
      SELECT COALESCE(credits, 0)
      INTO v_credit_balance
      FROM clients
      WHERE id = v_client_id;
    END IF;
    
    -- If still null, default to 0
    v_credit_balance := COALESCE(v_credit_balance, 0);
    
    -- Check if balance meets minimum requirement
    IF v_credit_balance < v_minimum_credit THEN
      RAISE EXCEPTION 'Insufficient credits to activate campaign. Minimum required: $%. Current balance: $%. Please add credits to your account.',
        v_minimum_credit,
        v_credit_balance
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE TRIGGER: Enforce credit check on campaign updates
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_check_campaign_activation_credit ON campaigns;

-- Create the trigger for INSERT operations
CREATE TRIGGER trigger_check_campaign_activation_credit_insert
  BEFORE INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION check_campaign_activation_credit();

-- Create the trigger for UPDATE operations  
CREATE TRIGGER trigger_check_campaign_activation_credit_update
  BEFORE UPDATE OF status ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION check_campaign_activation_credit();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION check_campaign_activation_credit() IS 
'Enforces minimum $100 credit balance requirement for campaign activation. 
Prevents campaigns from being set to active status if client has insufficient credits.';

-- =====================================================
-- HELPER FUNCTION: Get minimum campaign activation credit
-- =====================================================
-- This function can be called from the frontend to get the current minimum

CREATE OR REPLACE FUNCTION get_minimum_campaign_activation_credit()
RETURNS NUMERIC AS $$
BEGIN
  RETURN 100;  -- $100 minimum
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_minimum_campaign_activation_credit() IS 
'Returns the minimum credit balance required to activate a campaign ($100)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_minimum_campaign_activation_credit() TO authenticated;

