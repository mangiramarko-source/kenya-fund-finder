-- Create an atomic rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_ip_hash text, p_window_seconds int DEFAULT 60, p_max_requests int DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  hit_count int;
BEGIN
  -- Purge old entries
  DELETE FROM rate_limit_hits WHERE created_at < now() - (p_window_seconds || ' seconds')::interval;
  
  -- Count recent hits
  SELECT count(*) INTO hit_count FROM rate_limit_hits
    WHERE ip_hash = p_ip_hash AND created_at >= now() - (p_window_seconds || ' seconds')::interval;
  
  IF hit_count >= p_max_requests THEN
    RETURN false; -- rate limited
  END IF;
  
  -- Record hit
  INSERT INTO rate_limit_hits (ip_hash) VALUES (p_ip_hash);
  RETURN true; -- allowed
END;
$$;
