CREATE POLICY "Public can read ad media"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ads');