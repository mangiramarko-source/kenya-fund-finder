-- Recreate views WITHOUT security_invoker so anonymous users can read them
-- The WHERE clauses in the views provide the access control

DROP VIEW IF EXISTS public.funds_public;
CREATE VIEW public.funds_public AS
  SELECT id, name, slug, manager, fund_type, description, annual_yield, seven_day_yield,
         thirty_day_yield, daily_yield, yield_unit, minimum_investment, management_fee,
         withdrawal_time, website, cma_licensed, fact_sheet_date, is_published, created_at, updated_at
  FROM public.funds
  WHERE is_published = true;

DROP VIEW IF EXISTS public.news_articles_public;
CREATE VIEW public.news_articles_public AS
  SELECT id, title, summary, content, source, date_published, url, category,
         read_time, is_featured, status, created_at, updated_at
  FROM public.news_articles
  WHERE status = 'published';

DROP VIEW IF EXISTS public.site_pages_public;
CREATE VIEW public.site_pages_public AS
  SELECT id, slug, title, content, meta, updated_at
  FROM public.site_pages;

DROP VIEW IF EXISTS public.ads_public;
CREATE VIEW public.ads_public AS
  SELECT id, title, description, media_type, media_url, click_url, placement, start_date, end_date
  FROM public.ads
  WHERE is_active = true;