-- ============================================================================
-- ADD SIMULATION TRACKING FIELDS
-- ============================================================================
-- Add fields to track simulated/demo data for safe cleanup and identification
-- ============================================================================

-- Add is_simulated flag to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;

-- Add is_simulated flag to contacts
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;

-- Add simulation_batch_id to campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

-- Add is_simulated flag to recipients
ALTER TABLE recipients 
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;

-- Add indexes for simulation queries
CREATE INDEX IF NOT EXISTS idx_organizations_is_simulated 
ON organizations(is_simulated) WHERE is_simulated = true;

CREATE INDEX IF NOT EXISTS idx_contacts_is_simulated 
ON contacts(is_simulated) WHERE is_simulated = true;

CREATE INDEX IF NOT EXISTS idx_campaigns_simulation_batch 
ON campaigns(simulation_batch_id) WHERE simulation_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_is_simulated 
ON recipients(is_simulated) WHERE is_simulated = true;

-- Add comment for documentation
COMMENT ON COLUMN organizations.is_simulated IS 'Marks organizations created for demo/simulation purposes';
COMMENT ON COLUMN contacts.is_simulated IS 'Marks contacts created for demo/simulation purposes';
COMMENT ON COLUMN campaigns.simulation_batch_id IS 'Groups campaigns created together in a simulation batch';
COMMENT ON COLUMN recipients.is_simulated IS 'Marks recipients created for demo/simulation purposes';

