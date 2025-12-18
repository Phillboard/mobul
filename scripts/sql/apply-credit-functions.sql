-- =====================================================
-- Credit Management Functions - Apply Manually
-- =====================================================
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- Function 1: Get or create credit account
CREATE OR REPLACE FUNCTION get_credit_account(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_lock BOOLEAN DEFAULT FALSE
)
RETURNS credit_accounts AS $$
DECLARE
  v_account credit_accounts;
BEGIN
  IF p_lock THEN
    SELECT * INTO v_account
    FROM credit_accounts
    WHERE entity_type = p_entity_type AND entity_id = p_entity_id
    FOR UPDATE;
  ELSE
    SELECT * INTO v_account
    FROM credit_accounts
    WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO credit_accounts (
      entity_type, entity_id, balance, reserved_balance,
      total_purchased, total_used, total_remaining
    )
    VALUES (p_entity_type, p_entity_id, 0, 0, 0, 0, 0)
    RETURNING * INTO v_account;
  END IF;

  RETURN v_account;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get credit balance
CREATE OR REPLACE FUNCTION get_credit_balance(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance
  FROM credit_accounts
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Allocate credits
CREATE OR REPLACE FUNCTION allocate_credits_atomic(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_account credit_accounts;
  v_new_balance NUMERIC;
  v_new_total_remaining NUMERIC;
  v_new_total_purchased NUMERIC;
  v_transaction_id UUID;
BEGIN
  v_account := get_credit_account(p_entity_type, p_entity_id, TRUE);

  v_new_balance := v_account.balance + p_amount;
  v_new_total_purchased := v_account.total_purchased + p_amount;
  v_new_total_remaining := v_account.total_remaining + p_amount;

  UPDATE credit_accounts
  SET 
    balance = v_new_balance,
    total_purchased = v_new_total_purchased,
    total_remaining = v_new_total_remaining,
    updated_at = NOW()
  WHERE id = v_account.id;

  INSERT INTO credit_transactions (
    credit_account_id, transaction_type, amount, balance_after, description, created_by
  ) VALUES (
    v_account.id, 'allocation_in', p_amount, v_new_balance,
    COALESCE(p_description, 'Credit allocation'), p_user_id
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'transaction_id', v_transaction_id,
    'balance_before', v_account.balance,
    'balance_after', v_new_balance,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: Deduct credits
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_amount NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_account credit_accounts;
  v_new_balance NUMERIC;
  v_new_total_used NUMERIC;
  v_new_total_remaining NUMERIC;
  v_transaction_id UUID;
BEGIN
  SELECT * INTO v_account
  FROM credit_accounts
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit account not found for % %', p_entity_type, p_entity_id;
  END IF;

  IF v_account.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. Available: %, Required: %', v_account.balance, p_amount;
  END IF;

  v_new_balance := v_account.balance - p_amount;
  v_new_total_used := v_account.total_used + p_amount;
  v_new_total_remaining := v_account.total_remaining - p_amount;

  UPDATE credit_accounts
  SET 
    balance = v_new_balance,
    total_used = v_new_total_used,
    total_remaining = v_new_total_remaining,
    updated_at = NOW()
  WHERE id = v_account.id;

  INSERT INTO credit_transactions (
    credit_account_id, transaction_type, amount, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    v_account.id, 'redemption', -p_amount, v_new_balance,
    p_reference_type, p_reference_id,
    COALESCE(p_description, 'Credit deduction'), p_user_id
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'transaction_id', v_transaction_id,
    'balance_before', v_account.balance,
    'balance_after', v_new_balance,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: Transfer credits
CREATE OR REPLACE FUNCTION transfer_credits_atomic(
  p_from_entity_type TEXT,
  p_from_entity_id UUID,
  p_to_entity_type TEXT,
  p_to_entity_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_from_account credit_accounts;
  v_to_account credit_accounts;
  v_from_new_balance NUMERIC;
  v_to_new_balance NUMERIC;
  v_from_transaction_id UUID;
  v_to_transaction_id UUID;
BEGIN
  IF p_from_entity_id < p_to_entity_id THEN
    SELECT * INTO v_from_account
    FROM credit_accounts
    WHERE entity_type = p_from_entity_type AND entity_id = p_from_entity_id
    FOR UPDATE;
    
    v_to_account := get_credit_account(p_to_entity_type, p_to_entity_id, TRUE);
  ELSE
    v_to_account := get_credit_account(p_to_entity_type, p_to_entity_id, TRUE);
    
    SELECT * INTO v_from_account
    FROM credit_accounts
    WHERE entity_type = p_from_entity_type AND entity_id = p_from_entity_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source credit account not found';
  END IF;

  IF v_from_account.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits in source account. Available: %, Required: %', 
      v_from_account.balance, p_amount;
  END IF;

  v_from_new_balance := v_from_account.balance - p_amount;
  v_to_new_balance := v_to_account.balance + p_amount;

  UPDATE credit_accounts
  SET 
    balance = v_from_new_balance,
    total_used = total_used + p_amount,
    total_remaining = total_remaining - p_amount,
    updated_at = NOW()
  WHERE id = v_from_account.id;

  UPDATE credit_accounts
  SET 
    balance = v_to_new_balance,
    total_purchased = total_purchased + p_amount,
    total_remaining = total_remaining + p_amount,
    updated_at = NOW()
  WHERE id = v_to_account.id;

  INSERT INTO credit_transactions (
    credit_account_id, transaction_type, amount, balance_after,
    description, created_by, reference_type, reference_id
  ) VALUES (
    v_from_account.id, 'allocation_out', -p_amount, v_from_new_balance,
    COALESCE(p_description, format('Transfer to %s', p_to_entity_type)),
    p_user_id, 'credit_transfer', v_to_account.id
  ) RETURNING id INTO v_from_transaction_id;

  INSERT INTO credit_transactions (
    credit_account_id, transaction_type, amount, balance_after,
    description, created_by, reference_type, reference_id
  ) VALUES (
    v_to_account.id, 'allocation_in', p_amount, v_to_new_balance,
    COALESCE(p_description, format('Transfer from %s', p_from_entity_type)),
    p_user_id, 'credit_transfer', v_from_account.id
  ) RETURNING id INTO v_to_transaction_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'from_transaction_id', v_from_transaction_id,
    'to_transaction_id', v_to_transaction_id,
    'from_balance_after', v_from_new_balance,
    'to_balance_after', v_to_new_balance,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 6: Get transaction history
CREATE OR REPLACE FUNCTION get_credit_transaction_history(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  transaction_type TEXT,
  amount NUMERIC,
  balance_after NUMERIC,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id, t.transaction_type, t.amount, t.balance_after, t.description,
    t.reference_type, t.reference_id, t.created_by, t.created_at
  FROM credit_transactions t
  JOIN credit_accounts a ON a.id = t.credit_account_id
  WHERE a.entity_type = p_entity_type AND a.entity_id = p_entity_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_credit_account(TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION allocate_credits_atomic(TEXT, UUID, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits_atomic(TEXT, UUID, NUMERIC, TEXT, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_credits_atomic(TEXT, UUID, TEXT, UUID, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_transaction_history(TEXT, UUID, INT) TO authenticated;
