-- Add $1,000 credits to AutoCare Plus Warranty account
-- This script finds the client and allocates credits using the atomic function

DO $$
DECLARE
  v_client_id UUID;
  v_result JSONB;
BEGIN
  -- Find the client ID for AutoCare Plus Warranty
  SELECT id INTO v_client_id
  FROM clients
  WHERE name ILIKE '%AutoCare Plus Warranty%'
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Client "AutoCare Plus Warranty" not found';
  END IF;
  
  RAISE NOTICE 'Found client ID: %', v_client_id;
  
  -- Add $1,000 in credits using the atomic function
  SELECT allocate_credits_atomic(
    'client',
    v_client_id,
    1000.00,
    NULL,
    'Manual credit addition - $1,000 promotional credits',
    NULL
  ) INTO v_result;
  
  RAISE NOTICE 'Credit allocation result: %', v_result;
  RAISE NOTICE 'Successfully added $1,000 to AutoCare Plus Warranty!';
END;
$$;

-- Verify the balance after allocation
SELECT 
  c.name as client_name,
  ca.balance,
  ca.reserved_balance,
  ca.updated_at
FROM credit_accounts ca
JOIN clients c ON c.id = ca.entity_id
WHERE ca.entity_type = 'client'
  AND c.name ILIKE '%AutoCare Plus Warranty%';

