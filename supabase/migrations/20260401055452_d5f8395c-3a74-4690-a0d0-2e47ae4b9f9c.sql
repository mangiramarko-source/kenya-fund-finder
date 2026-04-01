-- 1. Remove notifications from realtime publication (prevents cross-user data leakage)
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;

-- 2. Add DELETE policy for avatars bucket so users can remove their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);