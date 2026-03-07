-- Drop and recreate upload policy with file extension check
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
  );

-- Also restrict updates
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
  );