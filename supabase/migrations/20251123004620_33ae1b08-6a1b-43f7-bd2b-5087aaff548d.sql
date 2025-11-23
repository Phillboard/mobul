-- Create ace_forms table for storing form configurations
CREATE TABLE ace_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  form_config JSONB NOT NULL DEFAULT '{"fields": [], "settings": {}}',
  template_id TEXT,
  is_active BOOLEAN DEFAULT true,
  total_submissions INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ace_form_submissions table for tracking form submissions
CREATE TABLE ace_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES ace_forms(id) ON DELETE CASCADE,
  gift_card_id UUID REFERENCES gift_cards(id),
  recipient_id UUID REFERENCES recipients(id),
  submission_data JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  redemption_token UUID,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Add gift card brand enhancements
ALTER TABLE gift_card_brands 
ADD COLUMN IF NOT EXISTS usage_restrictions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS redemption_instructions TEXT,
ADD COLUMN IF NOT EXISTS store_url TEXT,
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#6366f1';

-- Enable RLS
ALTER TABLE ace_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ace_forms
CREATE POLICY "Users can view forms for accessible clients"
  ON ace_forms FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create forms for accessible clients"
  ON ace_forms FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update forms for accessible clients"
  ON ace_forms FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete forms for accessible clients"
  ON ace_forms FOR DELETE
  USING (user_can_access_client(auth.uid(), client_id));

-- RLS Policies for ace_form_submissions
CREATE POLICY "Public can create submissions"
  ON ace_form_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view submissions for their forms"
  ON ace_form_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ace_forms af
      WHERE af.id = ace_form_submissions.form_id
      AND user_can_access_client(auth.uid(), af.client_id)
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_ace_forms_updated_at
  BEFORE UPDATE ON ace_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_ace_forms_client_id ON ace_forms(client_id);
CREATE INDEX idx_ace_forms_template_id ON ace_forms(template_id);
CREATE INDEX idx_ace_form_submissions_form_id ON ace_form_submissions(form_id);
CREATE INDEX idx_ace_form_submissions_gift_card_id ON ace_form_submissions(gift_card_id);
CREATE INDEX idx_ace_form_submissions_submitted_at ON ace_form_submissions(submitted_at DESC);