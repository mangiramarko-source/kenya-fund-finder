-- Fix: Convert public-facing SELECT policies from RESTRICTIVE to PERMISSIVE
-- RESTRICTIVE means ALL policies must pass (AND), which blocks anon users
-- PERMISSIVE means ANY policy can grant access (OR)

-- funds table
DROP POLICY IF EXISTS "Anyone can view published funds" ON public.funds;
CREATE POLICY "Anyone can view published funds"
  ON public.funds FOR SELECT
  USING (is_published = true);

-- news_articles table  
DROP POLICY IF EXISTS "Anyone can view published news" ON public.news_articles;
CREATE POLICY "Anyone can view published news"
  ON public.news_articles FOR SELECT
  USING (status = 'published');

-- fund_historical_yields table
DROP POLICY IF EXISTS "Anyone can view yields" ON public.fund_historical_yields;
CREATE POLICY "Anyone can view yields"
  ON public.fund_historical_yields FOR SELECT
  USING (true);

-- fund_yield_snapshots table
DROP POLICY IF EXISTS "Anyone can view yield snapshots" ON public.fund_yield_snapshots;
CREATE POLICY "Anyone can view yield snapshots"
  ON public.fund_yield_snapshots FOR SELECT
  USING (true);

-- site_pages table
DROP POLICY IF EXISTS "Anyone can view site pages" ON public.site_pages;
CREATE POLICY "Anyone can view site pages"
  ON public.site_pages FOR SELECT
  USING (true);