-- Add 'ai-html' to allowed editor_type values
ALTER TABLE public.landing_pages 
DROP CONSTRAINT IF EXISTS landing_pages_editor_type_check;

ALTER TABLE public.landing_pages 
ADD CONSTRAINT landing_pages_editor_type_check 
CHECK (editor_type IN ('ai', 'grapesjs', 'simple', 'ai-html'));