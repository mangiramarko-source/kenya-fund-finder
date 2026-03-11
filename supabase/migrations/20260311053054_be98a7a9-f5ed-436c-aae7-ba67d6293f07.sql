
-- Allow authenticated non-admin users to read published funds
CREATE POLICY "Authenticated can read published funds"
ON public.funds FOR SELECT TO authenticated
USING (is_published = true);

-- Allow authenticated non-admin users to read published news
CREATE POLICY "Authenticated can read published news"
ON public.news_articles FOR SELECT TO authenticated
USING (status = 'published');
