-- Migration: Hardening comments/likes RLS and check_rate_limit RPC

-- 1. Hardening RLS on public.post_comments
DROP POLICY IF EXISTS "Public comments are viewable by everyone" ON public.post_comments;
DROP POLICY IF EXISTS "Anyone can insert a comment" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users and guests can insert comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments or admins can moderate" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;

-- SELECT: Public comments are viewable by everyone
CREATE POLICY "Public comments are viewable by everyone"
ON public.post_comments
FOR SELECT
USING (true);

-- INSERT: Authenticated users must set user_id = auth.uid(); guests must have user_id IS NULL
CREATE POLICY "Users and guests can insert comments"
ON public.post_comments
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- UPDATE: Only owner can update comment content; cannot reassign ownership or post_id
CREATE POLICY "Users can update their own comments"
ON public.post_comments
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- DELETE: Only the owner (user_id = auth.uid()) or an admin can delete comments
CREATE POLICY "Users can delete their own comments or admins can moderate"
ON public.post_comments
FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
);

-- 2. Hardening RLS on public.post_likes
DROP POLICY IF EXISTS "Public likes are viewable by everyone" ON public.post_likes;
DROP POLICY IF EXISTS "Anyone can insert a like" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users and guests can insert likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes or guests can unlike by device" ON public.post_likes;

-- SELECT: Public likes are viewable by everyone
CREATE POLICY "Public likes are viewable by everyone"
ON public.post_likes
FOR SELECT
USING (true);

-- INSERT: Authenticated users must set user_id = auth.uid(); guests must have user_id IS NULL
CREATE POLICY "Users and guests can insert likes"
ON public.post_likes
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- DELETE: Authenticated owner can delete their own like; guests can delete guest likes; admin can moderate
CREATE POLICY "Users can delete their own likes or guests can unlike by device"
ON public.post_likes
FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND user_id IS NULL AND device_id IS NOT NULL)
  OR
  (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
);

-- 3. Hardening public.check_rate_limit RPC
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip_hash text,
  p_window_seconds int DEFAULT 60,
  p_max_requests int DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window int;
  v_max int;
  hit_count int;
BEGIN
  -- Reject empty / null identifiers
  IF p_ip_hash IS NULL OR length(trim(p_ip_hash)) = 0 THEN
    RETURN false;
  END IF;

  -- Constrain parameters server-side to prevent bypasses or integer abuse
  v_window := GREATEST(1, LEAST(COALESCE(p_window_seconds, 60), 86400));
  v_max := GREATEST(1, LEAST(COALESCE(p_max_requests, 30), 10000));

  -- Regular purge of stale entries (fixed threshold of 1 hour, decoupled from caller parameter)
  DELETE FROM rate_limit_hits WHERE created_at < now() - interval '1 hour';
  
  -- Count recent hits within window
  SELECT count(*) INTO hit_count
  FROM rate_limit_hits
  WHERE ip_hash = p_ip_hash
    AND created_at >= now() - (v_window || ' seconds')::interval;
  
  IF hit_count >= v_max THEN
    RETURN false; -- rate limited
  END IF;
  
  -- Record hit
  INSERT INTO rate_limit_hits (ip_hash) VALUES (p_ip_hash);
  RETURN true; -- allowed
END;
$$;

-- Restrict execution of check_rate_limit to service_role only (not client-callable)
REVOKE ALL ON FUNCTION public.check_rate_limit(text, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, int, int) FROM anon;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO service_role;
