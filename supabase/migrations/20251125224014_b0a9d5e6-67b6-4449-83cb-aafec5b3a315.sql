-- Add contact_list_id column to campaigns table for new Contacts/Lists/Segments system
-- Keep audience_id for backward compatibility with existing campaigns

ALTER TABLE campaigns ADD COLUMN contact_list_id UUID REFERENCES contact_lists(id);

COMMENT ON COLUMN campaigns.contact_list_id IS 'Links to contact_lists table (replaces audience_id for new campaigns)';
COMMENT ON COLUMN campaigns.audience_id IS 'DEPRECATED: Legacy audience system, kept for backward compatibility';