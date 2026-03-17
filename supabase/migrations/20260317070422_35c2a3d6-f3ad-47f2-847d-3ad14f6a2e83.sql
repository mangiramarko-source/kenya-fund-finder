
-- Remove anonymous and authenticated public SELECT policies from base tables
-- Public reads should go through _public views only

-- funds: remove anon and authenticated published-read policies (keep admin policies)
DROP POLICY IF EXISTS "Anon can read published funds" ON public.funds;
DROP POLICY IF EXISTS "Authenticated can read published funds" ON public.funds;

-- news_articles: remove anon and authenticated published-read policies
DROP POLICY IF EXISTS "Anon can read published news" ON public.news_articles;
DROP POLICY IF EXISTS "Authenticated can read published news" ON public.news_articles;

-- ads: remove anon read policy
DROP POLICY IF EXISTS "Anon can read active ads" ON public.ads;

-- exchange_rates: remove anon and authenticated active-read policies
DROP POLICY IF EXISTS "Anon can view active rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Authenticated can view active rates" ON public.exchange_rates;

-- commodities: remove anon and authenticated active-read policies
DROP POLICY IF EXISTS "Anon can view active commodities" ON public.commodities;
DROP POLICY IF EXISTS "Authenticated can view active commodities" ON public.commodities;

-- social_links: remove anon and authenticated active-read policies
DROP POLICY IF EXISTS "Anon can read active social links" ON public.social_links;
DROP POLICY IF EXISTS "Authenticated can read active social links" ON public.social_links;

-- site_pages: remove anon and authenticated read policies
DROP POLICY IF EXISTS "Anon can read site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Authenticated can read site pages" ON public.site_pages;

-- Now ensure the _public views have proper SELECT grants for anon and authenticated
GRANT SELECT ON public.funds_public TO anon, authenticated;
GRANT SELECT ON public.news_articles_public TO anon, authenticated;
GRANT SELECT ON public.ads_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rates_public TO anon, authenticated;
GRANT SELECT ON public.commodities_public TO anon, authenticated;
GRANT SELECT ON public.social_links_public TO anon, authenticated;
GRANT SELECT ON public.site_pages_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rate_history_public TO anon, authenticated;
