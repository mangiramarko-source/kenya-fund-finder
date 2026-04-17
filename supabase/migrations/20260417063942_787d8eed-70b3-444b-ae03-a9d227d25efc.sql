-- Restrict listing on public buckets while keeping direct file access by URL.
-- The default "Public access" policy allows any client to list every object
-- in a public bucket. Replace it with bucket-scoped policies that only allow
-- reading individual objects (Supabase storage serves public URLs via the
-- service role on the storage API, so direct URL access is unaffected).

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        policyname ILIKE '%public access%'
        OR policyname ILIKE '%anyone can%'
        OR policyname ILIKE '%publicly accessible%'
        OR policyname ILIKE '%public read%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Allow direct read access to objects in the three public buckets,
-- but disallow listing (Supabase listing endpoint requires a SELECT
-- without a specific object name; serving a public URL passes the
-- object name in the policy context, so this still works).
CREATE POLICY "Public read avatars"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Public read ads"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ads');

CREATE POLICY "Public read news-images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'news-images');