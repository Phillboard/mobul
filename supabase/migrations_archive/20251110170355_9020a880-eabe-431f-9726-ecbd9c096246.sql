-- Add 'approved' to campaign_status enum
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'approved';