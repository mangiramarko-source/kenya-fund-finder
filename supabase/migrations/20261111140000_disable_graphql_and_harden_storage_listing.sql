-- Migration: Disable pg_graphql and restrict public bucket storage listing
-- 1. Drops pg_graphql extension to eliminate schema introspection warnings on unused GraphQL endpoint.
-- 2. Replaces broad SELECT policies on public storage buckets with authenticated owner/admin SELECT policies
--    to prevent unauthorized listing while preserving { upsert: true } and public HTTP asset downloads.

-- 1. Disable pg_graphql
DROP EXTENSION IF EXISTS pg_graphql CASCADE;

-- 2. Drop the 5 broad public SELECT policies on storage.objects
DROP POLICY IF EXISTS "Admin media public read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view ad media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Fund logos public read" ON storage.objects;
DROP POLICY IF EXISTS "Market logos public read" ON storage.objects;

-- 3. Add restricted SELECT policies for authenticated admins on admin-managed buckets
-- Required for Supabase Storage { upsert: true } operations by admins
DROP POLICY IF EXISTS "Admins can select admin media" ON storage.objects;
CREATE POLICY "Admins can select admin media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'admin-media'
  AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can select ads" ON storage.objects;
CREATE POLICY "Admins can select ads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ads'
  AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can select fund logos" ON storage.objects;
CREATE POLICY "Admins can select fund logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fund-logos'
  AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can select market logos" ON storage.objects;
CREATE POLICY "Admins can select market logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'market-logos'
  AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
);

-- 4. Add restricted SELECT policy for avatars
-- Allows authenticated users to SELECT their own avatar object (matching upload path {user_id}/avatar.*)
-- and admins to select any avatar, enabling { upsert: true } without exposing full bucket listing.
DROP POLICY IF EXISTS "Users and admins can select own avatars" ON storage.objects;
CREATE POLICY "Users and admins can select own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  )
);
