DROP POLICY IF EXISTS "Authenticated users can insert own page views" ON public.page_views;
CREATE POLICY "Authenticated users can insert own page views"
  ON public.page_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());