
-- ============================================================
-- FIX 1: Remove anon SELECT policies from base tables
-- The _public views will use security_definer to bypass RLS
-- ============================================================

DROP POLICY IF EXISTS "Anon can read published funds" ON public.funds;
DROP POLICY IF EXISTS "Anon can read published news" ON public.news_articles;
DROP POLICY IF EXISTS "Anon can read site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Anon can read active ads" ON public.ads;
DROP POLICY IF EXISTS "Anon can view active rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Anon can view active commodities" ON public.commodities;
DROP POLICY IF EXISTS "Anon can read rate history" ON public.exchange_rate_history;

-- ============================================================
-- FIX 2: Recreate all public views WITHOUT security_invoker
-- (default = security_definer = runs as view owner = bypasses RLS)
-- This way anon can SELECT from views without needing base table access
-- ============================================================

DROP VIEW IF EXISTS public.funds_public;
CREATE VIEW public.funds_public AS
  SELECT id, name, slug, manager, fund_type, description,
    annual_yield, seven_day_yield, thirty_day_yield, daily_yield, yield_unit,
    minimum_investment, management_fee, withdrawal_time, website,
    cma_licensed, fact_sheet_date, is_published, created_at, updated_at
  FROM public.funds
  WHERE is_published = true;

DROP VIEW IF EXISTS public.news_articles_public;
CREATE VIEW public.news_articles_public AS
  SELECT id, title, summary, content, source, date_published, url,
    category, read_time, is_featured, status, created_at, updated_at
  FROM public.news_articles
  WHERE status = 'published';

DROP VIEW IF EXISTS public.site_pages_public;
CREATE VIEW public.site_pages_public AS
  SELECT id, slug, title, content, meta, updated_at
  FROM public.site_pages;

DROP VIEW IF EXISTS public.ads_public;
CREATE VIEW public.ads_public AS
  SELECT id, title, description, media_type, media_url, click_url,
    placement, start_date, end_date
  FROM public.ads
  WHERE is_active = true;

DROP VIEW IF EXISTS public.exchange_rates_public;
CREATE VIEW public.exchange_rates_public AS
  SELECT id, currency_code, currency_name, rate, previous_rate, sort_order, updated_at
  FROM public.exchange_rates
  WHERE is_active = true;

DROP VIEW IF EXISTS public.commodities_public;
CREATE VIEW public.commodities_public AS
  SELECT id, name, symbol, price, previous_price, unit, sort_order, updated_at
  FROM public.commodities
  WHERE is_active = true;

DROP VIEW IF EXISTS public.exchange_rate_history_public;
CREATE VIEW public.exchange_rate_history_public AS
  SELECT h.id, h.exchange_rate_id, r.currency_code, h.rate, h.snapshot_date
  FROM public.exchange_rate_history h
  JOIN public.exchange_rates r ON r.id = h.exchange_rate_id
  WHERE r.is_active = true;

-- Grant SELECT on all views to anon and authenticated
GRANT SELECT ON public.funds_public TO anon, authenticated;
GRANT SELECT ON public.news_articles_public TO anon, authenticated;
GRANT SELECT ON public.site_pages_public TO anon, authenticated;
GRANT SELECT ON public.ads_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rates_public TO anon, authenticated;
GRANT SELECT ON public.commodities_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rate_history_public TO anon, authenticated;

-- ============================================================
-- FIX 3: Lock down has_role to prevent role enumeration
-- Only allow checking your own role (used in RLS policies via auth.uid())
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND _user_id = auth.uid()
  )
$$;

-- Ensure only authenticated can call it
REVOKE EXECUTE ON FUNCTION public.has_role FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
