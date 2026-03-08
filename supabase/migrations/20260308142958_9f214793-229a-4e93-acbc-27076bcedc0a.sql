
-- Drop and recreate storage policies as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view ad media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload ad media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update ad media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete ad media" ON storage.objects;

CREATE POLICY "Anyone can view ad media" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'ads');

CREATE POLICY "Admins can upload ad media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'ads' 
    AND (SELECT has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Admins can update ad media" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'ads' 
    AND (SELECT has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Admins can delete ad media" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'ads' 
    AND (SELECT has_role(auth.uid(), 'admin'::app_role))
  );
