-- Remove anon SELECT policies from base tables (use _public views instead)
DROP POLICY IF EXISTS "Anon can read published funds" ON public.funds;
DROP POLICY IF EXISTS "Anon can read published news" ON public.news_articles;
DROP POLICY IF EXISTS "Anon can read site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Anon can read active ads" ON public.ads;
DROP POLICY IF EXISTS "Anyone can view active rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Anyone can view active commodities" ON public.commodities;

-- Recreate exchange_rates/commodities policies for authenticated only
CREATE POLICY "Authenticated can view active rates"
  ON public.exchange_rates FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated can view active commodities"
  ON public.commodities FOR SELECT TO authenticated
  USING (is_active = true);

-- Grant anon SELECT on views for public views (already done but ensure)
GRANT SELECT ON public.funds_public TO anon, authenticated;
GRANT SELECT ON public.news_articles_public TO anon, authenticated;
GRANT SELECT ON public.site_pages_public TO anon, authenticated;
GRANT SELECT ON public.ads_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rates_public TO anon, authenticated;
GRANT SELECT ON public.commodities_public TO anon, authenticated;