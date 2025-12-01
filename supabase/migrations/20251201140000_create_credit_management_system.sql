-- Credit Management System Schema
-- Provides hierarchical credit allocation: Platform → Agency → Client

-- Credit accounts table
CREATE TABLE IF NOT EXISTS credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('platform', 'agency', 'client')),
  entity_id UUID NOT NULL, -- References organizations.id or clients.id
  balance NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  reserved_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (reserved_balance >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  low_balance_threshold NUMERIC(10,2) DEFAULT 100.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES credit_accounts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'allocation', 'deduction', 'refund', 'transfer_out', 'transfer_in', 
    'purchase', 'adjustment', 'reversal'
  )),
  amount NUMERIC(10,2) NOT NULL,
  balance_before NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  reference_type TEXT, -- 'gift_card_purchase', 'campaign_cost', etc.
  reference_id UUID,
  from_account_id UUID REFERENCES credit_accounts(id),
  to_account_id UUID REFERENCES credit_accounts(id),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_credit_accounts_entity ON credit_accounts(entity_type, entity_id);
CREATE INDEX idx_credit_accounts_balance ON credit_accounts(balance) WHERE balance < 1000;
CREATE INDEX idx_credit_transactions_account ON credit_transactions(account_id, created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type, created_at DESC);
CREATE INDEX idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);

-- RLS Policies
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can view all credit accounts
CREATE POLICY "Admins can view all credit accounts"
  ON credit_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own organization/client credit account
CREATE POLICY "Users can view their credit accounts"
  ON credit_accounts FOR SELECT
  USING (
    entity_type = 'client' AND entity_id IN (
      SELECT client_id FROM client_users WHERE user_id = auth.uid()
    )
  );

-- Admins can insert/update credit accounts
CREATE POLICY "Admins can manage credit accounts"
  ON credit_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own transactions
CREATE POLICY "Users can view their transactions"
  ON credit_transactions FOR SELECT
  USING (
    account_id IN (
      SELECT ca.id FROM credit_accounts ca
      JOIN client_users cu ON cu.client_id = ca.entity_id
      WHERE cu.user_id = auth.uid() AND ca.entity_type = 'client'
    )
  );

-- Service role can insert transactions
CREATE POLICY "Service role can insert transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Function: Get credit account with locking
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

  -- Create account if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO credit_accounts (entity_type, entity_id, balance)
    VALUES (p_entity_type, p_entity_id, 0)
    RETURNING * INTO v_account;
  END IF;

  RETURN v_account;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Atomic credit deduction with validation
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
  v_transaction_id UUID;
BEGIN
  -- Get account with lock
  SELECT * INTO v_account
  FROM credit_accounts
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit account not found for % %', p_entity_type, p_entity_id;
  END IF;

  -- Validate sufficient balance
  IF v_account.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. Available: %, Required: %', v_account.balance, p_amount;
  END IF;

  -- Calculate new balance
  v_new_balance := v_account.balance - p_amount;

  -- Update account balance
  UPDATE credit_accounts
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_account.id;

  -- Record transaction
  INSERT INTO credit_transactions (
    account_id, transaction_type, amount, balance_before, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    v_account.id, 'deduction', p_amount, v_account.balance, v_new_balance,
    p_reference_type, p_reference_id, p_description, p_user_id
  ) RETURNING id INTO v_transaction_id;

  -- Check for low balance alert
  IF v_new_balance < v_account.low_balance_threshold THEN
    INSERT INTO system_alerts (alert_type, title, message, severity, metadata)
    VALUES (
      'low_credit_balance',
      format('Low Credit Balance: %s', p_entity_type),
      format('Credit balance is now $%.2f, below threshold of $%.2f', v_new_balance, v_account.low_balance_threshold),
      'warning',
      jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'balance', v_new_balance)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'transaction_id', v_transaction_id,
    'balance_before', v_account.balance,
    'balance_after', v_new_balance,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Allocate credits (add to account)
CREATE OR REPLACE FUNCTION allocate_credits_atomic(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_amount NUMERIC,
  p_from_account_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_account credit_accounts;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Get or create account with lock
  v_account := get_credit_account(p_entity_type, p_entity_id, TRUE);

  -- Calculate new balance
  v_new_balance := v_account.balance + p_amount;

  -- Update account balance
  UPDATE credit_accounts
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_account.id;

  -- Record transaction
  INSERT INTO credit_transactions (
    account_id, transaction_type, amount, balance_before, balance_after,
    from_account_id, description, created_by
  ) VALUES (
    v_account.id, 'allocation', p_amount, v_account.balance, v_new_balance,
    p_from_account_id, p_description, p_user_id
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

-- Function: Transfer credits between accounts
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
  v_from_transaction_id UUID;
  v_to_transaction_id UUID;
BEGIN
  -- Get both accounts with locks (ordered by ID to prevent deadlocks)
  SELECT * INTO v_from_account
  FROM credit_accounts
  WHERE entity_type = p_from_entity_type AND entity_id = p_from_entity_id
  FOR UPDATE;

  SELECT * INTO v_to_account
  FROM credit_accounts
  WHERE entity_type = p_to_entity_type AND entity_id = p_to_entity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'One or both credit accounts not found';
  END IF;

  -- Validate sufficient balance
  IF v_from_account.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits for transfer. Available: %, Required: %', 
      v_from_account.balance, p_amount;
  END IF;

  -- Deduct from source
  UPDATE credit_accounts
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = v_from_account.id;

  INSERT INTO credit_transactions (
    account_id, transaction_type, amount, balance_before, balance_after,
    to_account_id, description, created_by
  ) VALUES (
    v_from_account.id, 'transfer_out', p_amount, v_from_account.balance, 
    v_from_account.balance - p_amount, v_to_account.id, p_description, p_user_id
  ) RETURNING id INTO v_from_transaction_id;

  -- Add to destination
  UPDATE credit_accounts
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE id = v_to_account.id;

  INSERT INTO credit_transactions (
    account_id, transaction_type, amount, balance_before, balance_after,
    from_account_id, description, created_by
  ) VALUES (
    v_to_account.id, 'transfer_in', p_amount, v_to_account.balance,
    v_to_account.balance + p_amount, v_from_account.id, p_description, p_user_id
  ) RETURNING id INTO v_to_transaction_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'from_transaction_id', v_from_transaction_id,
    'to_transaction_id', v_to_transaction_id,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get credit balance
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

-- Function: Get transaction history
CREATE OR REPLACE FUNCTION get_credit_transaction_history(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  transaction_type TEXT,
  amount NUMERIC,
  balance_after NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.transaction_type,
    ct.amount,
    ct.balance_after,
    ct.description,
    ct.created_at
  FROM credit_transactions ct
  JOIN credit_accounts ca ON ca.id = ct.account_id
  WHERE ca.entity_type = p_entity_type AND ca.entity_id = p_entity_id
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE credit_accounts IS 'Hierarchical credit accounts for platform, agencies, and clients';
COMMENT ON TABLE credit_transactions IS 'Audit trail of all credit movements';
COMMENT ON FUNCTION deduct_credits_atomic IS 'Atomically deduct credits with balance validation';
COMMENT ON FUNCTION allocate_credits_atomic IS 'Atomically add credits to account';
COMMENT ON FUNCTION transfer_credits_atomic IS 'Atomically transfer credits between accounts';

GRANT EXECUTE ON FUNCTION get_credit_account TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION allocate_credits_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_credits_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_transaction_history TO authenticated;

