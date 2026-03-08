
-- Recreate all views with security_invoker=on
DROP VIEW IF EXISTS public.exchange_rate_history_public;
DROP VIEW IF EXISTS public.funds_public;
DROP VIEW IF EXISTS public.news_articles_public;
DROP VIEW IF EXISTS public.site_pages_public;
DROP VIEW IF EXISTS public.ads_public;
DROP VIEW IF EXISTS public.exchange_rates_public;
DROP VIEW IF EXISTS public.commodities_public;

CREATE VIEW public.funds_public WITH (security_invoker=on) AS
  SELECT id, name, slug, manager, fund_type, description, annual_yield, seven_day_yield, thirty_day_yield, daily_yield, yield_unit, minimum_investment, management_fee, withdrawal_time, website, cma_licensed, fact_sheet_date, is_published, created_at, updated_at
  FROM public.funds WHERE is_published = true;

CREATE VIEW public.news_articles_public WITH (security_invoker=on) AS
  SELECT id, title, summary, content, source, date_published, url, category, read_time, is_featured, status, created_at, updated_at
  FROM public.news_articles WHERE status = 'published';

CREATE VIEW public.site_pages_public WITH (security_invoker=on) AS
  SELECT id, slug, title, content, meta, updated_at FROM public.site_pages;

CREATE VIEW public.ads_public WITH (security_invoker=on) AS
  SELECT id, title, description, media_type, media_url, click_url, placement, start_date, end_date
  FROM public.ads WHERE is_active = true;

CREATE VIEW public.exchange_rates_public WITH (security_invoker=on) AS
  SELECT id, currency_code, currency_name, rate, previous_rate, sort_order, updated_at
  FROM public.exchange_rates WHERE is_active = true;

CREATE VIEW public.commodities_public WITH (security_invoker=on) AS
  SELECT id, name, symbol, price, previous_price, unit, sort_order, updated_at
  FROM public.commodities WHERE is_active = true;

CREATE VIEW public.exchange_rate_history_public WITH (security_invoker=on) AS
  SELECT h.id, h.exchange_rate_id, r.currency_code, h.rate, h.snapshot_date
  FROM public.exchange_rate_history h JOIN public.exchange_rates r ON r.id = h.exchange_rate_id
  WHERE r.is_active = true;

GRANT SELECT ON public.funds_public TO anon, authenticated;
GRANT SELECT ON public.news_articles_public TO anon, authenticated;
GRANT SELECT ON public.site_pages_public TO anon, authenticated;
GRANT SELECT ON public.ads_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rates_public TO anon, authenticated;
GRANT SELECT ON public.commodities_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rate_history_public TO anon, authenticated;
