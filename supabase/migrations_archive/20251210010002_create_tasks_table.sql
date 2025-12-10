-- Create Tasks table (GitHub Issue #8)
-- Provides task management functionality for the platform

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client-scoped access
CREATE POLICY "Users can view tasks for accessible clients"
ON public.tasks
FOR SELECT
USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create tasks for accessible clients"
ON public.tasks
FOR INSERT
WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update tasks for accessible clients"
ON public.tasks
FOR UPDATE
USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete tasks for accessible clients"
ON public.tasks
FOR DELETE
USING (user_can_access_client(auth.uid(), client_id));

-- Indexes for performance
CREATE INDEX idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_campaign_id ON public.tasks(campaign_id);

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

COMMENT ON TABLE public.tasks IS 'Task management table for tracking work items across the platform';

