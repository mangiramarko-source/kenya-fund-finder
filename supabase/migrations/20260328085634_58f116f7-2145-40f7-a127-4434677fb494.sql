-- 1. Add missing SELECT policy for authenticated users on ads table
CREATE POLICY "Auth can read active ads via view"
ON public.ads FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Fix security definer views - recreate with security_invoker = on

DROP VIEW IF EXISTS public.funds_public;
CREATE VIEW public.funds_public WITH (security_invoker = on) AS
SELECT id, annual_yield, seven_day_yield, thirty_day_yield, daily_yield,
       minimum_investment, management_fee, cma_licensed, fact_sheet_date,
       is_published, created_at, updated_at, name, slug, manager,
       fund_type, description, yield_unit, withdrawal_time, website
FROM public.funds
WHERE is_published = true;

DROP VIEW IF EXISTS public.stocks_public;
CREATE VIEW public.stocks_public WITH (security_invoker = on) AS
SELECT id, price, previous_price, day_change, day_change_percent,
       volume, market_cap, year_high, year_low, pe_ratio, dividend_yield,
       is_active, sort_order, updated_at, symbol, name, sector
FROM public.stocks
WHERE is_active = true;

DROP VIEW IF EXISTS public.exchange_rates_public;
CREATE VIEW public.exchange_rates_public WITH (security_invoker = on) AS
SELECT id, rate, previous_rate, sort_order, updated_at, currency_code, currency_name
FROM public.exchange_rates
WHERE is_active = true;

DROP VIEW IF EXISTS public.commodities_public;
CREATE VIEW public.commodities_public WITH (security_invoker = on) AS
SELECT id, price, previous_price, sort_order, updated_at, name, symbol, unit
FROM public.commodities
WHERE is_active = true;

DROP VIEW IF EXISTS public.ads_public;
CREATE VIEW public.ads_public WITH (security_invoker = on) AS
SELECT id, title, description, media_type, media_url, click_url, placement, start_date, end_date
FROM public.ads
WHERE is_active = true;

DROP VIEW IF EXISTS public.news_articles_public;
CREATE VIEW public.news_articles_public WITH (security_invoker = on) AS
SELECT id, title, summary, content, source, url, category, read_time, status,
       image_url, date_published, is_featured, created_at, updated_at
FROM public.news_articles
WHERE status = 'published';

DROP VIEW IF EXISTS public.social_links_public;
CREATE VIEW public.social_links_public WITH (security_invoker = on) AS
SELECT id, platform, url, icon_name, sort_order
FROM public.social_links
WHERE is_active = true;

DROP VIEW IF EXISTS public.site_pages_public;
CREATE VIEW public.site_pages_public WITH (security_invoker = on) AS
SELECT id, slug, title, content, meta, updated_at
FROM public.site_pages;

DROP VIEW IF EXISTS public.exchange_rate_history_public;
CREATE VIEW public.exchange_rate_history_public WITH (security_invoker = on) AS
SELECT h.id, h.exchange_rate_id, h.rate, h.snapshot_date, r.currency_code
FROM public.exchange_rate_history h
JOIN public.exchange_rates r ON r.id = h.exchange_rate_id;

DROP VIEW IF EXISTS public.stock_price_history_public;
CREATE VIEW public.stock_price_history_public WITH (security_invoker = on) AS
SELECT h.id, h.stock_id, h.price, h.snapshot_date, s.symbol
FROM public.stock_price_history h
JOIN public.stocks s ON s.id = h.stock_id