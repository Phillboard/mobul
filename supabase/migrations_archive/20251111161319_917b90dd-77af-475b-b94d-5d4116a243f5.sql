-- Create QR code configurations table
CREATE TABLE public.qr_code_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  layer_id TEXT NOT NULL,
  base_url TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  custom_utm_1 TEXT,
  custom_utm_2 TEXT,
  custom_utm_3 TEXT,
  size INTEGER DEFAULT 200,
  foreground_color TEXT DEFAULT '#000000',
  background_color TEXT DEFAULT '#FFFFFF',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qr_code_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view QR configs for accessible templates"
  ON public.qr_code_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.templates t
      WHERE t.id = qr_code_configs.template_id
      AND user_can_access_client(auth.uid(), t.client_id)
    )
  );

CREATE POLICY "Users can create QR configs for accessible templates"
  ON public.qr_code_configs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.templates t
      WHERE t.id = qr_code_configs.template_id
      AND user_can_access_client(auth.uid(), t.client_id)
    )
  );

CREATE POLICY "Users can update QR configs for accessible templates"
  ON public.qr_code_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.templates t
      WHERE t.id = qr_code_configs.template_id
      AND user_can_access_client(auth.uid(), t.client_id)
    )
  );

CREATE POLICY "Users can delete QR configs for accessible templates"
  ON public.qr_code_configs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.templates t
      WHERE t.id = qr_code_configs.template_id
      AND user_can_access_client(auth.uid(), t.client_id)
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_qr_code_configs_template_id ON public.qr_code_configs(template_id);
CREATE INDEX idx_qr_code_configs_layer_id ON public.qr_code_configs(layer_id);

-- Create updated_at trigger
CREATE TRIGGER update_qr_code_configs_updated_at
  BEFORE UPDATE ON public.qr_code_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();