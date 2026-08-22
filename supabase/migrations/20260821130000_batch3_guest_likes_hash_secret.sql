-- Migration: Cryptographically secure guest-like mechanism with unguessable token and server-side SHA-256 hash

-- 1. Ensure pgcrypto is enabled in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Add guest_hash column to post_likes if not exists
ALTER TABLE public.post_likes ADD COLUMN IF NOT EXISTS guest_hash TEXT;

-- 3. Backfill guest_hash from existing device_id if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'post_likes' AND column_name = 'device_id'
  ) THEN
    UPDATE public.post_likes
    SET guest_hash = encode(extensions.digest(device_id::bytea, 'sha256'), 'hex')
    WHERE guest_hash IS NULL AND user_id IS NULL AND device_id IS NOT NULL;

    ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_post_id_device_id_key;
    ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_device_id_key;
    ALTER TABLE public.post_likes DROP COLUMN IF EXISTS device_id;
  END IF;
END $$;

-- 4. Add strict constraints to post_likes
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_target_check;
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_target_check
  CHECK (
    (user_id IS NOT NULL AND guest_hash IS NULL)
    OR
    (user_id IS NULL AND guest_hash IS NOT NULL)
  );

ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_user_unique;
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_user_unique UNIQUE (post_id, user_id);

ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_guest_unique;
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_guest_unique UNIQUE (post_id, guest_hash);

-- 5. Configure RLS Policies on post_likes
DROP POLICY IF EXISTS "Public likes are viewable by everyone" ON public.post_likes;
DROP POLICY IF EXISTS "Users and guests can insert likes" ON public.post_likes;
DROP POLICY IF EXISTS "Anyone can insert a like" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can insert likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes or guests can unlike by device" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can delete their own likes or admins can moderate" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can delete their own likes or admins can mo" ON public.post_likes;

-- SELECT policy: Viewable by everyone
CREATE POLICY "Public likes are viewable by everyone"
ON public.post_likes
FOR SELECT
USING (true);

-- INSERT policy: Direct table INSERT is restricted to authenticated users inserting their own user_id
CREATE POLICY "Authenticated users can insert likes"
ON public.post_likes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid() AND guest_hash IS NULL
);

-- DELETE policy: Direct table DELETE is restricted to authenticated users deleting their own like or admins
CREATE POLICY "Authenticated users can delete their own likes or admins can moderate"
ON public.post_likes
FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
);

-- 6. Define SECURITY DEFINER RPCs

DROP FUNCTION IF EXISTS public.like_post(text, text);
DROP FUNCTION IF EXISTS public.unlike_post(text, text);
DROP FUNCTION IF EXISTS public.get_guest_liked_posts(text);

-- like_post RPC
CREATE OR REPLACE FUNCTION public.like_post(
  p_post_id text,
  p_guest_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id uuid;
  v_guest_hash text;
BEGIN
  v_user_id := auth.uid();

  IF p_post_id IS NULL OR length(trim(p_post_id)) = 0 OR length(p_post_id) > 200 THEN
    RETURN false;
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.post_likes (post_id, user_id, guest_hash)
    VALUES (trim(p_post_id), v_user_id, NULL)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    RETURN true;
  ELSE
    IF p_guest_token IS NULL OR length(trim(p_guest_token)) < 16 OR length(p_guest_token) > 500 THEN
      RETURN false;
    END IF;

    v_guest_hash := encode(extensions.digest(trim(p_guest_token)::bytea, 'sha256'), 'hex');

    INSERT INTO public.post_likes (post_id, user_id, guest_hash)
    VALUES (trim(p_post_id), NULL, v_guest_hash)
    ON CONFLICT (post_id, guest_hash) DO NOTHING;
    RETURN true;
  END IF;
END;
$$;

-- unlike_post RPC
CREATE OR REPLACE FUNCTION public.unlike_post(
  p_post_id text,
  p_guest_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id uuid;
  v_guest_hash text;
  v_deleted int;
BEGIN
  v_user_id := auth.uid();

  IF p_post_id IS NULL OR length(trim(p_post_id)) = 0 OR length(p_post_id) > 200 THEN
    RETURN false;
  END IF;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.post_likes
    WHERE post_id = trim(p_post_id) AND user_id = v_user_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
  ELSE
    IF p_guest_token IS NULL OR length(trim(p_guest_token)) < 16 OR length(p_guest_token) > 500 THEN
      RETURN false;
    END IF;

    v_guest_hash := encode(extensions.digest(trim(p_guest_token)::bytea, 'sha256'), 'hex');

    DELETE FROM public.post_likes
    WHERE post_id = trim(p_post_id) AND user_id IS NULL AND guest_hash = v_guest_hash;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
  END IF;
END;
$$;

-- get_guest_liked_posts RPC
CREATE OR REPLACE FUNCTION public.get_guest_liked_posts(
  p_guest_token text
)
RETURNS TABLE (post_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_guest_hash text;
BEGIN
  IF p_guest_token IS NULL OR length(trim(p_guest_token)) < 16 OR length(p_guest_token) > 500 THEN
    RETURN;
  END IF;

  v_guest_hash := encode(extensions.digest(trim(p_guest_token)::bytea, 'sha256'), 'hex');

  RETURN QUERY
  SELECT pl.post_id
  FROM public.post_likes pl
  WHERE pl.user_id IS NULL AND pl.guest_hash = v_guest_hash;
END;
$$;

-- Grant execute permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.like_post(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlike_post(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_liked_posts(text) TO anon, authenticated;
