-- =============================================================================
-- Harden Profile Avatar & Image Uploads Against Malicious File Payloads
-- =============================================================================
-- 1. Enforce strict server-side bucket limits (`file_size_limit` and
--    `allowed_mime_types`) on `avatars`, `fund-logos`, `news-images`, and `ads`
--    so SVG/HTML/XML/script uploads are rejected by Supabase Storage directly.
-- 2. Restore and tighten extension, filename, folder-depth, and MIME checks on
--    `storage.objects` RLS policies for `avatars` (which had been dropped in
--    20260425112645) as well as `fund-logos` and `news-images`.
-- 3. Add a BEFORE INSERT OR UPDATE validation trigger on `public.profiles`
--    so `avatar_url` can only store valid `https://` URLs (blocking `javascript:`,
--    `data:`, `vbscript:`, etc.) and `display_name` cannot contain HTML/script
--    tags (`<`, `>`) or exceed 80 characters.
-- =============================================================================

-- 1. Bucket-level MIME type & file size restrictions
UPDATE storage.buckets
SET
  file_size_limit = 2097152, -- 2 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id IN ('avatars', 'fund-logos');

UPDATE storage.buckets
SET
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id IN ('news-images', 'ads');

-- 2. Harden `avatars` RLS policies on `storage.objects`
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND COALESCE(array_length(storage.foldername(name), 1), 0) = 1
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
  AND lower(storage.filename(name)) ~ '^avatar\.(jpg|jpeg|png|gif|webp)$'
  AND COALESCE(metadata->>'mimetype', '') IN ('', 'image/jpeg', 'image/png', 'image/gif', 'image/webp')
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND COALESCE(array_length(storage.foldername(name), 1), 0) = 1
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
  AND lower(storage.filename(name)) ~ '^avatar\.(jpg|jpeg|png|gif|webp)$'
  AND COALESCE(metadata->>'mimetype', '') IN ('', 'image/jpeg', 'image/png', 'image/gif', 'image/webp')
);

-- 3. Harden `fund-logos` and `news-images` RLS policies on `storage.objects`
DROP POLICY IF EXISTS "Admins upload fund logos" ON storage.objects;
CREATE POLICY "Admins upload fund logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fund-logos'
  AND public.has_role(auth.uid(), 'admin')
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
);

DROP POLICY IF EXISTS "Admins update fund logos" ON storage.objects;
CREATE POLICY "Admins update fund logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fund-logos'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'fund-logos'
  AND public.has_role(auth.uid(), 'admin')
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
);

DROP POLICY IF EXISTS "Admins can upload news images" ON storage.objects;
CREATE POLICY "Admins can upload news images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'news-images'
  AND public.has_role(auth.uid(), 'admin')
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
);

DROP POLICY IF EXISTS "Admins can update news images" ON storage.objects;
CREATE POLICY "Admins can update news images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'news-images'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'news-images'
  AND public.has_role(auth.uid(), 'admin')
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
);

-- 4. Validate `profiles.avatar_url` and `profiles.display_name` at the DB level
CREATE OR REPLACE FUNCTION public.validate_profile_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.avatar_url IS NOT NULL AND btrim(NEW.avatar_url) <> '' THEN
    NEW.avatar_url := btrim(NEW.avatar_url);
    IF char_length(NEW.avatar_url) > 2048
       OR NEW.avatar_url !~* '^https://[^\s<>"'']+$'
    THEN
      RAISE EXCEPTION 'Invalid avatar_url: must be a valid https:// URL.';
    END IF;
  END IF;

  IF NEW.display_name IS NOT NULL THEN
    NEW.display_name := btrim(NEW.display_name);
    IF char_length(NEW.display_name) > 80 THEN
      RAISE EXCEPTION 'Display name must be 80 characters or fewer.';
    END IF;
    IF NEW.display_name ~ '[<>]' OR NEW.display_name ~* 'javascript:' THEN
      RAISE EXCEPTION 'Display name cannot contain HTML tags or script expressions.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_security_fields ON public.profiles;
CREATE TRIGGER trg_validate_profile_security_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_security_fields();
