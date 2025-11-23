-- Fix search_path for new functions
ALTER FUNCTION public.cleanup_rate_limit_tracking(INTEGER) 
SET search_path = public;

ALTER FUNCTION public.create_system_alert(TEXT, TEXT, TEXT, TEXT, JSONB) 
SET search_path = public;