-- Run this in Supabase SQL Editor to add documentation role-based access
-- Dashboard → SQL Editor → New Query → Paste this → Run

-- First, update the category constraint to include all categories
ALTER TABLE documentation_pages DROP CONSTRAINT IF EXISTS documentation_pages_category_check;
ALTER TABLE documentation_pages ADD CONSTRAINT documentation_pages_category_check 
  CHECK (category IN (
    'getting-started', 'architecture', 'features', 'developer-guide', 
    'api-reference', 'user-guides', 'operations', 'configuration', 'reference',
    'implementation', 'troubleshooting'
  ));

-- Add columns
ALTER TABLE documentation_pages 
  ADD COLUMN IF NOT EXISTS visible_to_roles app_role[] DEFAULT ARRAY['admin']::app_role[];

ALTER TABLE documentation_pages 
  ADD COLUMN IF NOT EXISTS doc_audience TEXT DEFAULT 'admin';

-- Add constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documentation_pages_doc_audience_check') THEN
    ALTER TABLE documentation_pages ADD CONSTRAINT documentation_pages_doc_audience_check 
      CHECK (doc_audience IN ('public', 'user', 'technical', 'admin'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doc_pages_visible_roles ON documentation_pages USING GIN(visible_to_roles);
CREATE INDEX IF NOT EXISTS idx_doc_pages_doc_audience ON documentation_pages(doc_audience);

-- Drop ALL existing policies (old and new)
DROP POLICY IF EXISTS "Admins can view documentation" ON documentation_pages;
DROP POLICY IF EXISTS "Admins can manage documentation" ON documentation_pages;
DROP POLICY IF EXISTS "Users can view docs matching their role" ON documentation_pages;
DROP POLICY IF EXISTS "Admins can create documentation" ON documentation_pages;
DROP POLICY IF EXISTS "Admins can update documentation" ON documentation_pages;
DROP POLICY IF EXISTS "Admins can delete documentation" ON documentation_pages;

-- Create new policies
CREATE POLICY "Users can view docs matching their role"
  ON documentation_pages FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY(visible_to_roles))
  );

CREATE POLICY "Admins can create documentation"
  ON documentation_pages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update documentation"
  ON documentation_pages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete documentation"
  ON documentation_pages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Populate visibility for existing docs
UPDATE documentation_pages SET 
  visible_to_roles = ARRAY['admin','tech_support','agency_owner','company_owner','developer','call_center']::app_role[],
  doc_audience = 'public'
WHERE category = 'getting-started';

UPDATE documentation_pages SET 
  visible_to_roles = ARRAY['admin','tech_support','agency_owner','company_owner','developer']::app_role[],
  doc_audience = 'user'
WHERE category = 'features';

UPDATE documentation_pages SET 
  visible_to_roles = ARRAY['admin','tech_support','developer']::app_role[],
  doc_audience = 'technical'
WHERE category IN ('architecture', 'developer-guide', 'api-reference');

UPDATE documentation_pages SET 
  visible_to_roles = ARRAY['admin']::app_role[],
  doc_audience = 'admin'
WHERE slug = 'admin-guide';

UPDATE documentation_pages SET 
  visible_to_roles = ARRAY['admin','tech_support','agency_owner']::app_role[],
  doc_audience = 'user'
WHERE slug = 'agency-guide';

UPDATE documentation_pages SET 
  visible_to_roles = ARRAY['admin','tech_support','agency_owner','company_owner']::app_role[],
  doc_audience = 'user'
WHERE slug = 'client-guide';

UPDATE documentation_pages SET 
  visible_to_roles = ARRAY['admin','tech_support','agency_owner','company_owner','call_center']::app_role[],
  doc_audience = 'user'
WHERE slug = 'call-center-guide';

UPDATE documentation_pages SET 
  visible_to_roles = ARRAY['admin','tech_support']::app_role[],
  doc_audience = 'admin'
WHERE category IN ('operations', 'troubleshooting');

-- Create helper function
CREATE OR REPLACE FUNCTION get_accessible_documentation()
RETURNS TABLE (
  id UUID, category TEXT, title TEXT, slug TEXT, file_path TEXT, 
  order_index INTEGER, doc_audience TEXT, visible_to_roles app_role[]
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT dp.id, dp.category, dp.title, dp.slug, dp.file_path, 
      dp.order_index, dp.doc_audience, dp.visible_to_roles
    FROM documentation_pages dp ORDER BY dp.category, dp.order_index, dp.title;
  ELSE
    RETURN QUERY SELECT dp.id, dp.category, dp.title, dp.slug, dp.file_path, 
      dp.order_index, dp.doc_audience, dp.visible_to_roles
    FROM documentation_pages dp
    WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY(dp.visible_to_roles))
    ORDER BY dp.category, dp.order_index, dp.title;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION get_accessible_documentation() TO authenticated;
