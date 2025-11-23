-- Phase 1: Add RPC function for incrementing stats
CREATE OR REPLACE FUNCTION increment_form_stat(
  form_id UUID,
  stat_name TEXT
) RETURNS VOID AS $$
BEGIN
  IF stat_name = 'views' THEN
    UPDATE ace_forms SET total_views = total_views + 1 WHERE id = form_id;
  ELSIF stat_name = 'submissions' THEN
    UPDATE ace_forms SET total_submissions = total_submissions + 1 WHERE id = form_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 2: Add draft support and auto-save tracking
ALTER TABLE ace_forms ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;
ALTER TABLE ace_forms ADD COLUMN IF NOT EXISTS last_auto_save TIMESTAMPTZ;

-- Add contact linking to submissions for enrichment (just UUID for now, no FK constraint)
ALTER TABLE ace_form_submissions ADD COLUMN IF NOT EXISTS contact_id UUID;
ALTER TABLE ace_form_submissions ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ace_form_submissions_contact_id ON ace_form_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_ace_forms_client_draft ON ace_forms(client_id, is_draft);