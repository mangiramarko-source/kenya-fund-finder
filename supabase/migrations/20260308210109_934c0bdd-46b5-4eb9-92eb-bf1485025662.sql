-- Fix 1: Recreate all views with security_invoker=on

DROP VIEW IF EXISTS public.funds_public;
CREATE VIEW public.funds_public
WITH (security_invoker=on) AS
  SELECT id, name, slug, manager, fund_type, description,
    annual_yield, seven_day_yield, thirty_day_yield, daily_yield, yield_unit,
    minimum_investment, management_fee, withdrawal_time, website,
    cma_licensed, fact_sheet_date, is_published, created_at, updated_at
  FROM public.funds
  WHERE is_published = true;

DROP VIEW IF EXISTS public.news_articles_public;
CREATE VIEW public.news_articles_public
WITH (security_invoker=on) AS
  SELECT id, title, summary, content, source, date_published, url,
    category, read_time, is_featured, status, created_at, updated_at
  FROM public.news_articles
  WHERE status = 'published';

DROP VIEW IF EXISTS public.site_pages_public;
CREATE VIEW public.site_pages_public
WITH (security_invoker=on) AS
  SELECT id, slug, title, content, meta, updated_at
  FROM public.site_pages;

DROP VIEW IF EXISTS public.ads_public;
CREATE VIEW public.ads_public
WITH (security_invoker=on) AS
  SELECT id, title, description, media_type, media_url, click_url,
    placement, start_date, end_date
  FROM public.ads
  WHERE is_active = true;

-- Grant SELECT on views to anon and authenticated
GRANT SELECT ON public.funds_public TO anon, authenticated;
GRANT SELECT ON public.news_articles_public TO anon, authenticated;
GRANT SELECT ON public.site_pages_public TO anon, authenticated;
GRANT SELECT ON public.ads_public TO anon, authenticated;

-- Fix 2: Add permissive SELECT policies for anon on base tables used by views
-- (security_invoker views need the querying role to pass RLS)

-- Funds: anon can read published
CREATE POLICY "Anon can read published funds"
  ON public.funds FOR SELECT TO anon
  USING (is_published = true);

-- News: anon can read published
CREATE POLICY "Anon can read published news"
  ON public.news_articles FOR SELECT TO anon
  USING (status = 'published');

-- Site pages: anon can read all
CREATE POLICY "Anon can read site pages"
  ON public.site_pages FOR SELECT TO anon
  USING (true);

-- Ads: anon can read active
CREATE POLICY "Anon can read active ads"
  ON public.ads FOR SELECT TO anon
  USING (is_active = true);

-- Fix 3: Revoke public execute on has_role to prevent admin enumeration
REVOKE EXECUTE ON FUNCTION public.has_role FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;

-- Fix 4: Hide updated_by from public access on exchange_rates and commodities
-- Update the SELECT policy to exclude updated_by by creating public views

CREATE VIEW public.exchange_rates_public
WITH (security_invoker=on) AS
  SELECT id, currency_code, currency_name, rate, previous_rate, sort_order, updated_at
  FROM public.exchange_rates
  WHERE is_active = true;

CREATE VIEW public.commodities_public
WITH (security_invoker=on) AS
  SELECT id, name, symbol, price, previous_price, unit, sort_order, updated_at
  FROM public.commodities
  WHERE is_active = true;

GRANT SELECT ON public.exchange_rates_public TO anon, authenticated;
GRANT SELECT ON public.commodities_public TO anon, authenticated;