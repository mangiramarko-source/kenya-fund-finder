-- Re-grant anon access to has_role — the function is SECURITY DEFINER 
-- and only returns a boolean, so it's safe for anon to call.
-- Without this, restrictive admin policies fail with "permission denied" 
-- even when permissive public policies should grant access.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;