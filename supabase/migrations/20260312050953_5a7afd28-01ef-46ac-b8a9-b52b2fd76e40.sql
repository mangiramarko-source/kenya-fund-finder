CREATE POLICY "Authenticated can read site pages"
ON public.site_pages
FOR SELECT
TO authenticated
USING (true);