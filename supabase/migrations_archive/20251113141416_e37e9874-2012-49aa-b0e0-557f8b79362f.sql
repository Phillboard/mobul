-- Create table for storing Dr. Phillip chat sessions
CREATE TABLE IF NOT EXISTS public.dr_phillip_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dr_phillip_chats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chats"
  ON public.dr_phillip_chats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats"
  ON public.dr_phillip_chats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON public.dr_phillip_chats
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
  ON public.dr_phillip_chats
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_dr_phillip_chats_user_id ON public.dr_phillip_chats(user_id);
CREATE INDEX idx_dr_phillip_chats_created_at ON public.dr_phillip_chats(created_at DESC);

-- Create trigger for updating updated_at
CREATE TRIGGER update_dr_phillip_chats_updated_at
  BEFORE UPDATE ON public.dr_phillip_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();