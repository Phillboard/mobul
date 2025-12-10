-- Add unique constraint on (category, slug) for documentation_pages
-- This allows upsert operations to work correctly

-- First check for any duplicates that would prevent adding the constraint
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT category, slug, COUNT(*) as cnt
    FROM documentation_pages
    GROUP BY category, slug
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot add unique constraint: % duplicate (category, slug) combinations found', duplicate_count;
  END IF;
END $$;

-- Add the unique constraint
ALTER TABLE documentation_pages
ADD CONSTRAINT documentation_pages_category_slug_key UNIQUE (category, slug);