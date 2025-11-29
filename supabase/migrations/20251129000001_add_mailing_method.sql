-- Add mailing_method column to campaigns
-- Determines whether client handles their own mail or ACE does fulfillment

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS mailing_method TEXT 
CHECK (mailing_method IN ('self', 'ace_fulfillment')) 
DEFAULT 'self';

-- Add comment for clarity
COMMENT ON COLUMN public.campaigns.mailing_method IS 
'self = client handles their own mail design/fulfillment, ace_fulfillment = ACE handles everything';

-- Add design_image_url for self-mailers who want to upload their design
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS design_image_url TEXT;

COMMENT ON COLUMN public.campaigns.design_image_url IS 
'URL of uploaded mail design image for self-mailer campaigns';

-- Update campaign_drafts to support mailing_method in form_data
-- (No schema change needed, just ensure form data includes it)

-- Create index for quick filtering by mailing method
CREATE INDEX IF NOT EXISTS idx_campaigns_mailing_method 
ON public.campaigns(mailing_method);

SELECT 'Added mailing_method to campaigns' as status;

