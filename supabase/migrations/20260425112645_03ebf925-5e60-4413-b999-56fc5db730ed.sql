-- Restrict LIST/SELECT on storage.objects so anonymous clients can no longer
-- enumerate every file path in our public buckets. Files remain publicly
-- viewable when accessed by direct URL (because the buckets are still public),
-- but bucket contents can no longer be listed by anon/authenticated clients.

-- 1) Remove any over-permissive "true" SELECT policies on objects in our buckets
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Public read avatars','Public read ads','Public read news-images',
        'Anyone can view avatars','Anyone can view ads','Anyone can view news-images',
        'Avatar images are publicly accessible','Ad images are publicly accessible',
        'News images are publicly accessible'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END$$;

-- 2) Restrict listing: only admins can enumerate objects in these buckets.
--    (Direct file URLs still work because the buckets are marked public.)
CREATE POLICY "Admins can list avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can list own avatar"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can list ads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'ads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can list news images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'news-images' AND public.has_role(auth.uid(), 'admin'));

-- 3) Tighten write policies so only the right principals can mutate
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins manage ads bucket" ON storage.objects;
CREATE POLICY "Admins manage ads bucket"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'ads' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'ads' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage news images bucket" ON storage.objects;
CREATE POLICY "Admins manage news images bucket"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'news-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'news-images' AND public.has_role(auth.uid(), 'admin'));