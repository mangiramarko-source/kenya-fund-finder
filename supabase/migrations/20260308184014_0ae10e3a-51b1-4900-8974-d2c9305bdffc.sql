-- Fix 1: Add CHECK constraints on funds.website and news_articles.url
ALTER TABLE public.funds
  ADD CONSTRAINT funds_website_scheme
  CHECK (website = '' OR website ~* '^https?://');

ALTER TABLE public.news_articles
  ADD CONSTRAINT news_url_scheme
  CHECK (url IS NULL OR url ~* '^https?://');

-- Fix 2: Recreate public views with security_invoker = true
DROP VIEW IF EXISTS public.funds_public;
CREATE VIEW public.funds_public WITH (security_invoker = true) AS
  SELECT id, name, slug, manager, fund_type, description, annual_yield, seven_day_yield,
         thirty_day_yield, daily_yield, yield_unit, minimum_investment, management_fee,
         withdrawal_time, website, cma_licensed, fact_sheet_date, is_published, created_at, updated_at
  FROM public.funds
  WHERE is_published = true;

DROP VIEW IF EXISTS public.news_articles_public;
CREATE VIEW public.news_articles_public WITH (security_invoker = true) AS
  SELECT id, title, summary, content, source, date_published, url, category,
         read_time, is_featured, status, created_at, updated_at
  FROM public.news_articles
  WHERE status = 'published';

DROP VIEW IF EXISTS public.site_pages_public;
CREATE VIEW public.site_pages_public WITH (security_invoker = true) AS
  SELECT id, slug, title, content, meta, updated_at
  FROM public.site_pages;