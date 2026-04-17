UPDATE storage.buckets
SET public = false
WHERE id IN ('avatars', 'ads', 'news-images');