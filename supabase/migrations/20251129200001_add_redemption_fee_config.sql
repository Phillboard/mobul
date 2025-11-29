-- Add redemption fee configuration to organizations and clients
-- Default 20% fee at agency level, with optional client-level override

-- Add redemption_fee_percentage to organizations (agency-level default)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS redemption_fee_percentage NUMERIC(5,2) DEFAULT 20.00
CHECK (redemption_fee_percentage >= 0 AND redemption_fee_percentage <= 100);

COMMENT ON COLUMN public.organizations.redemption_fee_percentage IS 
'Default redemption fee percentage charged per successful gift card redemption (0-100). Default is 20%.';

-- Add redemption_fee_override to clients (client-level override)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS redemption_fee_override NUMERIC(5,2) DEFAULT NULL
CHECK (redemption_fee_override IS NULL OR (redemption_fee_override >= 0 AND redemption_fee_override <= 100));

COMMENT ON COLUMN public.clients.redemption_fee_override IS 
'Optional override for redemption fee percentage at client level. If NULL, uses organization default.';

-- Update existing organizations to have the default 20% fee
UPDATE public.organizations
SET redemption_fee_percentage = 20.00
WHERE redemption_fee_percentage IS NULL;

