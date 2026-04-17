UPDATE storage.buckets
SET public = true
WHERE id IN ('avatars', 'ads', 'news-images');