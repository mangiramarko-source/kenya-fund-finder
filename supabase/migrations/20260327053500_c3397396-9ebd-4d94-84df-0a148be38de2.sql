
-- Add UPDATE policy for news-images storage bucket (needed for upsert/overwrite)
CREATE POLICY "Admins can update news images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'news-images'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'news-images'
  AND public.has_role(auth.uid(), 'admin')
);
