
-- Recreate _public views WITHOUT security_invoker so they run as the owner,
-- bypassing the base table RLS. This is safe because the views already filter
-- rows and exclude sensitive columns (created_by, updated_by, source_url).

CREATE OR REPLACE VIEW public.funds_public
WITH (security_invoker=off) AS
SELECT id, name, slug, manager, fund_type, description,
       annual_yield, seven_day_yield, thirty_day_yield, daily_yield, yield_unit,
       minimum_investment, management_fee, withdrawal_time, website,
       cma_licensed, fact_sheet_date, is_published, created_at, updated_at
FROM funds WHERE is_published = true;

CREATE OR REPLACE VIEW public.news_articles_public
WITH (security_invoker=off) AS
SELECT id, title, summary, content, source, date_published, url,
       category, read_time, is_featured, status, created_at, updated_at
FROM news_articles WHERE status = 'published';

CREATE OR REPLACE VIEW public.ads_public
WITH (security_invoker=off) AS
SELECT id, title, description, media_type, media_url, click_url,
       placement, start_date, end_date
FROM ads WHERE is_active = true;

CREATE OR REPLACE VIEW public.exchange_rates_public
WITH (security_invoker=off) AS
SELECT id, currency_code, currency_name, rate, previous_rate, sort_order, updated_at
FROM exchange_rates WHERE is_active = true;

CREATE OR REPLACE VIEW public.commodities_public
WITH (security_invoker=off) AS
SELECT id, name, symbol, price, previous_price, unit, sort_order, updated_at
FROM commodities WHERE is_active = true;

CREATE OR REPLACE VIEW public.social_links_public
WITH (security_invoker=off) AS
SELECT id, platform, url, icon_name, sort_order
FROM social_links WHERE is_active = true;

CREATE OR REPLACE VIEW public.site_pages_public
WITH (security_invoker=off) AS
SELECT id, slug, title, content, meta, updated_at
FROM site_pages;

CREATE OR REPLACE VIEW public.exchange_rate_history_public
WITH (security_invoker=off) AS
SELECT h.id, h.exchange_rate_id, r.currency_code, h.rate, h.snapshot_date
FROM exchange_rate_history h
JOIN exchange_rates r ON r.id = h.exchange_rate_id
WHERE r.is_active = true;

-- Re-grant SELECT on views to anon and authenticated
GRANT SELECT ON public.funds_public TO anon, authenticated;
GRANT SELECT ON public.news_articles_public TO anon, authenticated;
GRANT SELECT ON public.ads_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rates_public TO anon, authenticated;
GRANT SELECT ON public.commodities_public TO anon, authenticated;
GRANT SELECT ON public.social_links_public TO anon, authenticated;
GRANT SELECT ON public.site_pages_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rate_history_public TO anon, authenticated;
