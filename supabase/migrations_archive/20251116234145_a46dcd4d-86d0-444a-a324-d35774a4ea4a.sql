-- Add editor_type column to landing_pages table
ALTER TABLE landing_pages 
ADD COLUMN editor_type text DEFAULT 'ai' CHECK (editor_type IN ('ai', 'visual'));

-- Create index for better query performance
CREATE INDEX idx_landing_pages_editor_type ON landing_pages(editor_type);

-- Add comment explaining the column
COMMENT ON COLUMN landing_pages.editor_type IS 'Indicates which editor was used to create the page: ai (AI-generated) or visual (GrapeJS drag-and-drop)';