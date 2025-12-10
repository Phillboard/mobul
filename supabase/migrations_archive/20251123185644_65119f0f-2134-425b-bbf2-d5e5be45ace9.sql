-- Phase 8: Monitoring & Observability
-- Create error tracking table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_code TEXT,
  stack_trace TEXT,
  component_name TEXT,
  function_name TEXT,
  url TEXT,
  user_agent TEXT,
  request_data JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  metric_type TEXT NOT NULL, -- 'page_load', 'api_response', 'edge_function', 'database_query'
  metric_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create usage analytics table
CREATE TABLE IF NOT EXISTS public.usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'feature_used', 'page_view', 'action_completed'
  feature_name TEXT NOT NULL,
  metadata JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_occurred ON public.error_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON public.error_logs(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_client ON public.error_logs(client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON public.error_logs(error_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON public.error_logs(resolved, occurred_at DESC) WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.performance_metrics(metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_client ON public.performance_metrics(client_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_duration ON public.performance_metrics(metric_type, duration_ms DESC);

CREATE INDEX IF NOT EXISTS idx_usage_analytics_event ON public.usage_analytics(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_feature ON public.usage_analytics(feature_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_client ON public.usage_analytics(client_id, occurred_at DESC);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for error_logs
CREATE POLICY "Admins can view all error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert error logs"
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for performance_metrics
CREATE POLICY "Admins can view all performance metrics"
  ON public.performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert performance metrics"
  ON public.performance_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for usage_analytics
CREATE POLICY "Admins can view all usage analytics"
  ON public.usage_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert usage analytics"
  ON public.usage_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);