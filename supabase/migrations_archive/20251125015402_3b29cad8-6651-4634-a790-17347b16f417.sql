-- Create contacts table (Master CRM database)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Basic Information
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  company TEXT,
  job_title TEXT,
  
  -- Address
  address TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  
  -- Marketing Fields
  lifecycle_stage TEXT DEFAULT 'lead' CHECK (lifecycle_stage IN ('lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist')),
  lead_source TEXT,
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  
  -- Contact Preferences
  do_not_contact BOOLEAN DEFAULT false,
  email_opt_out BOOLEAN DEFAULT false,
  sms_opt_out BOOLEAN DEFAULT false,
  
  -- Custom Fields (Industry-specific)
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  notes TEXT,
  last_activity_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_user_id UUID,
  
  -- Unique constraints per client
  UNIQUE(client_id, email),
  UNIQUE(client_id, phone)
);

-- Create indexes for contacts
CREATE INDEX idx_contacts_client_id ON public.contacts(client_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_lifecycle_stage ON public.contacts(lifecycle_stage);
CREATE INDEX idx_contacts_lead_score ON public.contacts(lead_score);
CREATE INDEX idx_contacts_custom_fields ON public.contacts USING GIN(custom_fields);
CREATE INDEX idx_contacts_last_activity ON public.contacts(last_activity_date);

-- Full-text search index
CREATE INDEX idx_contacts_search ON public.contacts USING gin(
  to_tsvector('english', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(last_name, '') || ' ' || 
    COALESCE(email, '') || ' ' || 
    COALESCE(company, '')
  )
);

-- Create contact_lists table (Lists & Segments)
CREATE TABLE IF NOT EXISTS public.contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Type: static (manual) or dynamic (rule-based segment)
  list_type TEXT NOT NULL DEFAULT 'static' CHECK (list_type IN ('static', 'dynamic')),
  
  -- For dynamic segments: JSON rules
  filter_rules JSONB DEFAULT '{}'::jsonb,
  
  -- Stats
  contact_count INTEGER DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_user_id UUID,
  
  UNIQUE(client_id, name)
);

-- Create indexes for contact_lists
CREATE INDEX idx_contact_lists_client_id ON public.contact_lists(client_id);
CREATE INDEX idx_contact_lists_type ON public.contact_lists(list_type);
CREATE INDEX idx_contact_lists_filter_rules ON public.contact_lists USING GIN(filter_rules);

-- Create contact_list_members table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.contact_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by_user_id UUID,
  
  UNIQUE(contact_id, list_id)
);

-- Create indexes for contact_list_members
CREATE INDEX idx_contact_list_members_contact ON public.contact_list_members(contact_id);
CREATE INDEX idx_contact_list_members_list ON public.contact_list_members(list_id);

-- Create contact_tags table (Flexible tagging)
CREATE TABLE IF NOT EXISTS public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  
  tag TEXT NOT NULL,
  tag_category TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by_user_id UUID,
  
  UNIQUE(contact_id, tag)
);

-- Create indexes for contact_tags
CREATE INDEX idx_contact_tags_contact ON public.contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag ON public.contact_tags(tag);
CREATE INDEX idx_contact_tags_category ON public.contact_tags(tag_category);

-- Add contact_id to recipients for linking
ALTER TABLE public.recipients
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_contact_id ON public.recipients(contact_id);

-- Enable RLS on all new tables
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Users can view contacts for accessible clients"
  ON public.contacts FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create contacts for accessible clients"
  ON public.contacts FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update contacts for accessible clients"
  ON public.contacts FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete contacts for accessible clients"
  ON public.contacts FOR DELETE
  USING (user_can_access_client(auth.uid(), client_id));

-- RLS Policies for contact_lists
CREATE POLICY "Users can view lists for accessible clients"
  ON public.contact_lists FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create lists for accessible clients"
  ON public.contact_lists FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update lists for accessible clients"
  ON public.contact_lists FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete lists for accessible clients"
  ON public.contact_lists FOR DELETE
  USING (user_can_access_client(auth.uid(), client_id));

-- RLS Policies for contact_list_members
CREATE POLICY "Users can view list members for accessible contacts"
  ON public.contact_list_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_list_members.contact_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Users can manage list members for accessible contacts"
  ON public.contact_list_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_list_members.contact_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- RLS Policies for contact_tags
CREATE POLICY "Users can view tags for accessible contacts"
  ON public.contact_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_tags.contact_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Users can manage tags for accessible contacts"
  ON public.contact_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_tags.contact_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contacts_timestamp
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

CREATE TRIGGER update_contact_lists_timestamp
  BEFORE UPDATE ON public.contact_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();