-- Fix function search path security issue
CREATE OR REPLACE FUNCTION increment_form_stat(
  form_id UUID,
  stat_name TEXT
) RETURNS VOID AS $$
BEGIN
  IF stat_name = 'views' THEN
    UPDATE ace_forms SET total_views = total_views + 1 WHERE id = form_id;
  ELSIF stat_name = 'submissions' THEN
    UPDATE ace_forms SET total_submissions = total_submissions + 1 WHERE id = form_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;