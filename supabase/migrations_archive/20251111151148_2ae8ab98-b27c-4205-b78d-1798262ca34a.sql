-- Campaign Drafts table for auto-saving
CREATE TABLE public.campaign_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  user_id UUID NOT NULL,
  draft_name TEXT NOT NULL,
  form_data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign Versions table for version history
CREATE TABLE public.campaign_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_description TEXT
);

-- Campaign Prototypes table
CREATE TABLE public.campaign_prototypes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  prototype_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Preview Links table for shareable previews
CREATE TABLE public.preview_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  max_views INTEGER,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign Comments for feedback
CREATE TABLE public.campaign_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign Approvals
CREATE TABLE public.campaign_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_prototypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_drafts
CREATE POLICY "Users can manage drafts for accessible clients"
ON public.campaign_drafts
FOR ALL
USING (user_can_access_client(auth.uid(), client_id));

-- RLS Policies for campaign_versions
CREATE POLICY "Users can view versions for accessible campaigns"
ON public.campaign_versions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM campaigns c
  WHERE c.id = campaign_versions.campaign_id
  AND user_can_access_client(auth.uid(), c.client_id)
));

CREATE POLICY "Users can create versions for accessible campaigns"
ON public.campaign_versions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM campaigns c
  WHERE c.id = campaign_versions.campaign_id
  AND user_can_access_client(auth.uid(), c.client_id)
));

-- RLS Policies for campaign_prototypes
CREATE POLICY "Users can manage prototypes for accessible campaigns"
ON public.campaign_prototypes
FOR ALL
USING (EXISTS (
  SELECT 1 FROM campaigns c
  WHERE c.id = campaign_prototypes.campaign_id
  AND user_can_access_client(auth.uid(), c.client_id)
));

-- RLS Policies for preview_links
CREATE POLICY "Users can manage preview links for accessible campaigns"
ON public.preview_links
FOR ALL
USING (EXISTS (
  SELECT 1 FROM campaigns c
  WHERE c.id = preview_links.campaign_id
  AND user_can_access_client(auth.uid(), c.client_id)
));

CREATE POLICY "Public can view preview links with valid token"
ON public.preview_links
FOR SELECT
USING (true);

-- RLS Policies for campaign_comments
CREATE POLICY "Users can manage comments for accessible campaigns"
ON public.campaign_comments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM campaigns c
  WHERE c.id = campaign_comments.campaign_id
  AND user_can_access_client(auth.uid(), c.client_id)
));

-- RLS Policies for campaign_approvals
CREATE POLICY "Users can manage approvals for accessible campaigns"
ON public.campaign_approvals
FOR ALL
USING (EXISTS (
  SELECT 1 FROM campaigns c
  WHERE c.id = campaign_approvals.campaign_id
  AND user_can_access_client(auth.uid(), c.client_id)
));

-- Indexes for performance
CREATE INDEX idx_campaign_drafts_client_user ON public.campaign_drafts(client_id, user_id);
CREATE INDEX idx_campaign_versions_campaign ON public.campaign_versions(campaign_id, version_number DESC);
CREATE INDEX idx_preview_links_token ON public.preview_links(token);
CREATE INDEX idx_campaign_comments_campaign ON public.campaign_comments(campaign_id, created_at DESC);
CREATE INDEX idx_campaign_approvals_campaign ON public.campaign_approvals(campaign_id);

-- Trigger for updated_at on campaign_drafts
CREATE TRIGGER update_campaign_drafts_updated_at
BEFORE UPDATE ON public.campaign_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();