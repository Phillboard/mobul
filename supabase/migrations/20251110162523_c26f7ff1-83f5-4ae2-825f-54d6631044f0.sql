-- Create function to get geographic distribution of recipients by state
CREATE OR REPLACE FUNCTION public.get_audience_geo_distribution(audience_id_param UUID)
RETURNS TABLE (state TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.state,
    COUNT(*)::BIGINT as count
  FROM public.recipients r
  WHERE r.audience_id = audience_id_param
  GROUP BY r.state
  ORDER BY count DESC;
$$;