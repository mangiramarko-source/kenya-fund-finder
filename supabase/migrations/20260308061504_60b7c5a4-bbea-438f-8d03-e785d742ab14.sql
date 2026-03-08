
-- Fix the view to use SECURITY INVOKER instead of SECURITY DEFINER
ALTER VIEW public.funds_public SET (security_invoker = on);
