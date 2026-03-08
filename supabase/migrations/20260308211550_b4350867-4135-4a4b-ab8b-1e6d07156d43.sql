
-- Restore anon SELECT policies on base tables so security_invoker views work for anonymous users

CREATE POLICY "Anon can read published funds"
  ON public.funds FOR SELECT TO anon
  USING (is_published = true);

CREATE POLICY "Anon can read published news"
  ON public.news_articles FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Anon can read site pages"
  ON public.site_pages FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can read active ads"
  ON public.ads FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Anon can view active rates"
  ON public.exchange_rates FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Anon can view active commodities"
  ON public.commodities FOR SELECT TO anon
  USING (is_active = true);
