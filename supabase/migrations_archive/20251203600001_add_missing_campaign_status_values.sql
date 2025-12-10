-- =====================================================
-- ADD MISSING CAMPAIGN STATUS ENUM VALUES
-- =====================================================
-- The campaign_status enum was missing several values that
-- the application code expects. This migration adds them.
-- 
-- Current values: 'draft', 'proofed', 'in_production', 'mailed', 'completed', 'approved'
-- Adding: 'active', 'paused', 'scheduled', 'cancelled'
-- =====================================================

-- Add 'active' status (for campaigns that are live and accepting redemptions)
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'active';

-- Add 'paused' status (for temporarily suspended campaigns)
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'paused';

-- Add 'scheduled' status (for campaigns scheduled to go live at a future date)
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'scheduled';

-- Add 'cancelled' status (for campaigns that were cancelled before completion)
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'cancelled';

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TYPE campaign_status IS 
'Campaign lifecycle statuses:
- draft: Initial state, campaign is being configured
- proofed: Campaign design has been proofed/reviewed
- scheduled: Campaign is scheduled to go live at a future date
- active: Campaign is live and accepting redemptions
- in_production: Mail pieces are being printed
- mailed: Mail pieces have been sent
- paused: Campaign temporarily suspended
- completed: Campaign has finished
- approved: Campaign has been approved for production
- cancelled: Campaign was cancelled';

