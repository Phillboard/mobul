-- Add slug column to clients table for public URLs
ALTER TABLE clients ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug) WHERE slug IS NOT NULL;

-- Generate slugs for existing clients
UPDATE clients 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- Make sure slugs are unique by appending ID if needed
WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM clients
  WHERE slug IS NOT NULL
)
UPDATE clients c
SET slug = c.slug || '-' || SUBSTRING(c.id::text, 1, 8)
FROM duplicates d
WHERE c.id = d.id AND d.rn > 1;

-- Add comment
COMMENT ON COLUMN clients.slug IS 'URL-friendly slug for public landing page URLs';

