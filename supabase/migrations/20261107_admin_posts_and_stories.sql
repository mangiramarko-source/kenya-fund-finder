-- =============================================================================
-- Admin Posts & Stories Feature: Personas, Multimedia Posts, Storage, and RLS
-- =============================================================================

-- 1. Admin Personas Table
CREATE TABLE IF NOT EXISTS public.admin_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text NOT NULL,
  badge_title text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin personas public read" ON public.admin_personas;
CREATE POLICY "Admin personas public read"
  ON public.admin_personas FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage personas" ON public.admin_personas;
CREATE POLICY "Admins can manage personas"
  ON public.admin_personas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Admin Posts Table
CREATE TABLE IF NOT EXISTS public.admin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  persona_id uuid REFERENCES public.admin_personas(id) ON DELETE SET NULL,
  custom_author_name text,
  custom_avatar_url text,
  title text,
  content text NOT NULL,
  post_type text NOT NULL DEFAULT 'both' CHECK (post_type IN ('story', 'feed', 'both')),
  category text NOT NULL DEFAULT 'market_update' CHECK (category IN ('market_update', 'educational', 'opinion', 'platform_announcement')),
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  disclaimer_type text NOT NULL DEFAULT 'cma_standard' CHECK (disclaimer_type IN ('cma_standard', 'educational', 'opinion', 'none')),
  is_published boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published admin posts public read" ON public.admin_posts;
CREATE POLICY "Published admin posts public read"
  ON public.admin_posts FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins can view all posts" ON public.admin_posts;
CREATE POLICY "Admins can view all posts"
  ON public.admin_posts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage posts" ON public.admin_posts;
CREATE POLICY "Admins can manage posts"
  ON public.admin_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_admin_posts_published 
  ON public.admin_posts (is_published, post_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_posts_expires 
  ON public.admin_posts (expires_at) 
  WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS update_admin_posts_updated_at ON public.admin_posts;
CREATE TRIGGER update_admin_posts_updated_at
  BEFORE UPDATE ON public.admin_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Public View Increments RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_admin_post_view(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.admin_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_post_id AND is_published = true;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_admin_post_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_admin_post_view(uuid) TO anon, authenticated;

-- 4. Storage Bucket Registration & Policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admin-media',
  'admin-media',
  true,
  104857600, -- 100 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']::text[];

DROP POLICY IF EXISTS "Admin media public read" ON storage.objects;
CREATE POLICY "Admin media public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'admin-media');

DROP POLICY IF EXISTS "Admins upload admin media" ON storage.objects;
CREATE POLICY "Admins upload admin media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'admin-media' 
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins update admin media" ON storage.objects;
CREATE POLICY "Admins update admin media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'admin-media' 
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    bucket_id = 'admin-media' 
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins delete admin media" ON storage.objects;
CREATE POLICY "Admins delete admin media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'admin-media' 
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );
