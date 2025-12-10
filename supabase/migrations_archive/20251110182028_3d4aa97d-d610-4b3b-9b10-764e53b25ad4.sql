-- Create storage bucket for template images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for template images
CREATE POLICY "Anyone can view template images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'templates');

CREATE POLICY "Authenticated users can upload template images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'templates' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their template images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'templates' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their template images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'templates' AND auth.role() = 'authenticated');

-- Create a sample client for seeding templates (if needed)
-- This assumes there's at least one client in the system
DO $$
DECLARE
  sample_client_id uuid;
BEGIN
  -- Get the first client or create one if none exists
  SELECT id INTO sample_client_id FROM clients LIMIT 1;
  
  IF sample_client_id IS NULL THEN
    -- If no client exists, skip template seeding
    RAISE NOTICE 'No clients found, skipping template seeding';
    RETURN;
  END IF;

  -- Seed starter templates for Roofing vertical
  INSERT INTO templates (name, client_id, size, industry_vertical, is_favorite, json_layers) VALUES
  (
    'Storm Damage Alert',
    sample_client_id,
    '4x6',
    'roofing',
    false,
    jsonb_build_object(
      'version', '1.0',
      'canvasSize', jsonb_build_object('width', 1800, 'height', 1200),
      'layers', jsonb_build_array(
        jsonb_build_object(
          'id', 'layer-1',
          'type', 'shape',
          'shape', 'rectangle',
          'fill', '#1a4d7c',
          'width', 1800,
          'height', 1200,
          'left', 0,
          'top', 0,
          'zIndex', 0
        ),
        jsonb_build_object(
          'id', 'layer-2',
          'type', 'text',
          'text', 'STORM DAMAGE?',
          'fontSize', 72,
          'fontFamily', 'Arial',
          'fontWeight', 'bold',
          'fill', '#FFFFFF',
          'left', 150,
          'top', 300,
          'zIndex', 1
        ),
        jsonb_build_object(
          'id', 'layer-3',
          'type', 'text',
          'text', 'Free Roof Inspection',
          'fontSize', 48,
          'fontFamily', 'Arial',
          'fill', '#FFD700',
          'left', 150,
          'top', 420,
          'zIndex', 2
        ),
        jsonb_build_object(
          'id', 'layer-4',
          'type', 'text',
          'text', 'Call {{phone}} Today!',
          'fontSize', 36,
          'fontFamily', 'Arial',
          'fontWeight', 'bold',
          'fill', '#FFFFFF',
          'left', 150,
          'top', 900,
          'zIndex', 3
        )
      )
    )
  ),
  (
    'Professional Roofing Service',
    sample_client_id,
    '6x9',
    'roofing',
    false,
    jsonb_build_object(
      'version', '1.0',
      'canvasSize', jsonb_build_object('width', 2700, 'height', 1800),
      'layers', jsonb_build_array(
        jsonb_build_object(
          'id', 'layer-1',
          'type', 'shape',
          'shape', 'rectangle',
          'fill', '#FFFFFF',
          'width', 2700,
          'height', 1800,
          'left', 0,
          'top', 0,
          'zIndex', 0
        ),
        jsonb_build_object(
          'id', 'layer-2',
          'type', 'text',
          'text', 'Dear {{first_name}},',
          'fontSize', 42,
          'fontFamily', 'Arial',
          'fill', '#333333',
          'left', 200,
          'top', 300,
          'zIndex', 1
        ),
        jsonb_build_object(
          'id', 'layer-3',
          'type', 'text',
          'text', 'Your roof needs attention!',
          'fontSize', 56,
          'fontFamily', 'Arial',
          'fontWeight', 'bold',
          'fill', '#1a4d7c',
          'left', 200,
          'top', 400,
          'zIndex', 2
        ),
        jsonb_build_object(
          'id', 'layer-4',
          'type', 'text',
          'text', 'Schedule your FREE inspection at {{purl}}',
          'fontSize', 32,
          'fontFamily', 'Arial',
          'fill', '#666666',
          'left', 200,
          'top', 1400,
          'zIndex', 3
        ),
        jsonb_build_object(
          'id', 'layer-5',
          'type', 'qr_code',
          'data', '{{purl}}',
          'size', 200,
          'left', 2300,
          'top', 100,
          'zIndex', 4
        )
      )
    )
  ),
  -- REI/Flipper templates
  (
    'We Buy Houses - Cash Offer',
    sample_client_id,
    '4x6',
    'rei',
    false,
    jsonb_build_object(
      'version', '1.0',
      'canvasSize', jsonb_build_object('width', 1800, 'height', 1200),
      'layers', jsonb_build_array(
        jsonb_build_object(
          'id', 'layer-1',
          'type', 'shape',
          'shape', 'rectangle',
          'fill', '#2c5f2d',
          'width', 1800,
          'height', 1200,
          'left', 0,
          'top', 0,
          'zIndex', 0
        ),
        jsonb_build_object(
          'id', 'layer-2',
          'type', 'text',
          'text', 'WE BUY HOUSES',
          'fontSize', 64,
          'fontFamily', 'Arial',
          'fontWeight', 'bold',
          'fill', '#FFFFFF',
          'left', 150,
          'top', 350,
          'zIndex', 1
        ),
        jsonb_build_object(
          'id', 'layer-3',
          'type', 'text',
          'text', 'CASH OFFER',
          'fontSize', 56,
          'fontFamily', 'Arial',
          'fontWeight', 'bold',
          'fill', '#FFD700',
          'left', 150,
          'top', 480,
          'zIndex', 2
        ),
        jsonb_build_object(
          'id', 'layer-4',
          'type', 'text',
          'text', 'Any Condition • Fast Close',
          'fontSize', 32,
          'fontFamily', 'Arial',
          'fill', '#FFFFFF',
          'left', 150,
          'top', 900,
          'zIndex', 3
        )
      )
    )
  ),
  -- Auto Service templates
  (
    'Service Reminder - Auto',
    sample_client_id,
    '6x9',
    'auto_service',
    false,
    jsonb_build_object(
      'version', '1.0',
      'canvasSize', jsonb_build_object('width', 2700, 'height', 1800),
      'layers', jsonb_build_array(
        jsonb_build_object(
          'id', 'layer-1',
          'type', 'shape',
          'shape', 'rectangle',
          'fill', '#c41e3a',
          'width', 2700,
          'height', 1800,
          'left', 0,
          'top', 0,
          'zIndex', 0
        ),
        jsonb_build_object(
          'id', 'layer-2',
          'type', 'text',
          'text', 'Hi {{first_name}},',
          'fontSize', 48,
          'fontFamily', 'Arial',
          'fill', '#FFFFFF',
          'left', 200,
          'top', 300,
          'zIndex', 1
        ),
        jsonb_build_object(
          'id', 'layer-3',
          'type', 'text',
          'text', 'Time for Your Service!',
          'fontSize', 64,
          'fontFamily', 'Arial',
          'fontWeight', 'bold',
          'fill', '#FFFFFF',
          'left', 200,
          'top', 400,
          'zIndex', 2
        ),
        jsonb_build_object(
          'id', 'layer-4',
          'type', 'text',
          'text', '20% OFF Service',
          'fontSize', 56,
          'fontFamily', 'Arial',
          'fontWeight', 'bold',
          'fill', '#FFD700',
          'left', 200,
          'top', 550,
          'zIndex', 3
        ),
        jsonb_build_object(
          'id', 'layer-5',
          'type', 'text',
          'text', 'Schedule at {{purl}}',
          'fontSize', 36,
          'fontFamily', 'Arial',
          'fill', '#FFFFFF',
          'left', 200,
          'top', 1400,
          'zIndex', 4
        )
      )
    )
  );

END $$;