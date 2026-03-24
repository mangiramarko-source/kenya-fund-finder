CREATE POLICY "Anon can read site pages for public view"
  ON public.site_pages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Auth can read site pages for public view"
  ON public.site_pages FOR SELECT
  TO authenticated
  USING (true);