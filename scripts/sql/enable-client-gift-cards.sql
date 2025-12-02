/**
 * Quick Fix: Enable Gift Cards for All Clients
 * 
 * This script automatically enables all available gift card brands and denominations
 * for all clients in the system. Run this to fix the "can't select Starbucks" issue.
 */

-- First, let's see what clients we have
SELECT id, name FROM clients ORDER BY created_at DESC LIMIT 10;

-- Enable all gift cards for a specific client (replace with your client ID)
-- Example: INSERT INTO client_available_gift_cards...

-- OR: Enable all gift cards for ALL clients
INSERT INTO client_available_gift_cards (client_id, brand_id, denomination, is_enabled)
SELECT 
  c.id as client_id,
  d.brand_id,
  d.denomination,
  true as is_enabled
FROM clients c
CROSS JOIN gift_card_denominations d
WHERE d.is_enabled_by_admin = true
ON CONFLICT (client_id, brand_id, denomination) DO UPDATE 
  SET is_enabled = true;

-- Verify the results
SELECT 
  c.name as client_name,
  b.brand_name,
  cagc.denomination,
  cagc.is_enabled
FROM client_available_gift_cards cagc
JOIN clients c ON c.id = cagc.client_id
JOIN gift_card_brands b ON b.id = cagc.brand_id
ORDER BY c.name, b.brand_name, cagc.denomination;

