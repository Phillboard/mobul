-- Documentation Pages Table
CREATE TABLE public.documentation_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'getting-started', 'architecture', 'features', 'developer-guide', 
    'api-reference', 'user-guides', 'operations', 'configuration', 'reference'
  )),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  content TEXT,
  order_index INTEGER DEFAULT 0,
  is_admin_only BOOLEAN DEFAULT true,
  search_keywords TEXT[],
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documentation Views (analytics)
CREATE TABLE public.documentation_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES documentation_pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  time_spent_seconds INTEGER,
  referrer TEXT
);

-- Documentation Feedback
CREATE TABLE public.documentation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES documentation_pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE documentation_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documentation_pages
CREATE POLICY "Admins can view documentation"
  ON documentation_pages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage documentation"
  ON documentation_pages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for documentation_views
CREATE POLICY "Users can view own documentation views"
  ON documentation_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documentation views"
  ON documentation_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all documentation views"
  ON documentation_views FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for documentation_feedback
CREATE POLICY "Authenticated users can submit feedback"
  ON documentation_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own feedback"
  ON documentation_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
  ON documentation_feedback FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_documentation_pages_category ON documentation_pages(category);
CREATE INDEX idx_documentation_pages_slug ON documentation_pages(slug);
CREATE INDEX idx_documentation_views_page_id ON documentation_views(page_id);
CREATE INDEX idx_documentation_views_user_id ON documentation_views(user_id);
CREATE INDEX idx_documentation_feedback_page_id ON documentation_feedback(page_id);