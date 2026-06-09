
CREATE POLICY "Admins read social-images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'social-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write social-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'social-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update social-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'social-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete social-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'social-images' AND public.has_role(auth.uid(),'admin'));
