-- Add canvas_state column to templates table for new canvas-based designer
ALTER TABLE templates ADD COLUMN IF NOT EXISTS canvas_state JSONB DEFAULT NULL;

-- Add columns for uploaded front/back images
ALTER TABLE templates ADD COLUMN IF NOT EXISTS front_image_url TEXT DEFAULT NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS back_image_url TEXT DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN templates.canvas_state IS 'Canvas state for new visual designer (alternative to grapesjs_project)';
COMMENT ON COLUMN templates.front_image_url IS 'Uploaded front design image URL';
COMMENT ON COLUMN templates.back_image_url IS 'Uploaded back design image URL';
