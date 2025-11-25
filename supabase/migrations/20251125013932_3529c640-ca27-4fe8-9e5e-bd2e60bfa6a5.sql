-- Phase 1: Make recipients table flexible for any industry
-- Only redemption_code is required, everything else optional

-- Make mailing address fields OPTIONAL (currently required)
ALTER TABLE recipients
  ALTER COLUMN address1 DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN state DROP NOT NULL,
  ALTER COLUMN zip DROP NOT NULL;

-- Add custom_fields for industry-specific data
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for fast custom_fields queries
CREATE INDEX IF NOT EXISTS idx_recipients_custom_fields 
  ON recipients USING GIN (custom_fields);

-- Add comment explaining the flexible schema
COMMENT ON COLUMN recipients.custom_fields IS 'Industry-specific custom data - stores any additional fields from CSV imports that dont map to standard columns';

-- Update existing records to have empty custom_fields
UPDATE recipients 
SET custom_fields = '{}'::jsonb 
WHERE custom_fields IS NULL;