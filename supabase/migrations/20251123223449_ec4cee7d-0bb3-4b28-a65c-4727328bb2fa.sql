-- Create beta_feedback table for collecting user feedback during beta testing
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature_request', 'feedback')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to view all feedback (transparency during beta)
CREATE POLICY "Users can view all beta feedback"
ON public.beta_feedback FOR SELECT
USING (true);

-- Allow authenticated users to submit feedback
CREATE POLICY "Users can create beta feedback"
ON public.beta_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admins to update feedback status
CREATE POLICY "Admins can update beta feedback"
ON public.beta_feedback FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_beta_feedback_user_id ON public.beta_feedback(user_id);
CREATE INDEX idx_beta_feedback_status ON public.beta_feedback(status);
CREATE INDEX idx_beta_feedback_type ON public.beta_feedback(feedback_type);

-- Add updated_at trigger
CREATE TRIGGER update_beta_feedback_updated_at
BEFORE UPDATE ON public.beta_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();