-- Migration: Restrict post_likes direct DELETE to authenticated owners/admins, provide secure unlike_post RPC for guest and user unliking

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes or guests can unlike by device" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can delete their own likes or admins can moderate" ON public.post_likes;

-- DELETE policy on post_likes: only authenticated owners and admins can issue direct table DELETE
CREATE POLICY "Authenticated users can delete their own likes or admins can moderate"
ON public.post_likes
FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
);

-- Secure unlike_post RPC for scoped unliking
CREATE OR REPLACE FUNCTION public.unlike_post(
  p_post_id text,
  p_device_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_deleted int;
BEGIN
  v_user_id := auth.uid();
  
  IF p_post_id IS NULL OR length(trim(p_post_id)) = 0 THEN
    RETURN false;
  END IF;
  
  IF v_user_id IS NOT NULL THEN
    -- Authenticated user: delete own like by user_id
    DELETE FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = v_user_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
  ELSE
    -- Guest: strictly require non-empty device_id and only delete matching guest like
    IF p_device_id IS NULL OR length(trim(p_device_id)) = 0 THEN
      RETURN false;
    END IF;
    
    DELETE FROM public.post_likes
    WHERE post_id = p_post_id AND user_id IS NULL AND device_id = p_device_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlike_post(text, text) TO anon, authenticated;
