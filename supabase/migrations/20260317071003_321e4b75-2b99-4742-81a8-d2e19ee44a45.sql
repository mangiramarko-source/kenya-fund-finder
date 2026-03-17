
-- Switch views back to security_invoker=on to satisfy linter,
-- and restore limited anon SELECT on base tables for the views to work.
-- The _public views already exclude created_by/updated_by columns.

-- Recreate views with security_invoker=on
CREATE OR REPLACE VIEW public.funds_public
WITH (security_invoker=on) AS
SELECT id, name, slug, manager, fund_type, description,
       annual_yield, seven_day_yield, thirty_day_yield, daily_yield, yield_unit,
       minimum_investment, management_fee, withdrawal_time, website,
       cma_licensed, fact_sheet_date, is_published, created_at, updated_at
FROM funds WHERE is_published = true;

CREATE OR REPLACE VIEW public.news_articles_public
WITH (security_invoker=on) AS
SELECT id, title, summary, content, source, date_published, url,
       category, read_time, is_featured, status, created_at, updated_at
FROM news_articles WHERE status = 'published';

CREATE OR REPLACE VIEW public.ads_public
WITH (security_invoker=on) AS
SELECT id, title, description, media_type, media_url, click_url,
       placement, start_date, end_date
FROM ads WHERE is_active = true;

CREATE OR REPLACE VIEW public.exchange_rates_public
WITH (security_invoker=on) AS
SELECT id, currency_code, currency_name, rate, previous_rate, sort_order, updated_at
FROM exchange_rates WHERE is_active = true;

CREATE OR REPLACE VIEW public.commodities_public
WITH (security_invoker=on) AS
SELECT id, name, symbol, price, previous_price, unit, sort_order, updated_at
FROM commodities WHERE is_active = true;

CREATE OR REPLACE VIEW public.social_links_public
WITH (security_invoker=on) AS
SELECT id, platform, url, icon_name, sort_order
FROM social_links WHERE is_active = true;

CREATE OR REPLACE VIEW public.site_pages_public
WITH (security_invoker=on) AS
SELECT id, slug, title, content, meta, updated_at
FROM site_pages;

CREATE OR REPLACE VIEW public.exchange_rate_history_public
WITH (security_invoker=on) AS
SELECT h.id, h.exchange_rate_id, r.currency_code, h.rate, h.snapshot_date
FROM exchange_rate_history h
JOIN exchange_rates r ON r.id = h.exchange_rate_id
WHERE r.is_active = true;

-- Re-add limited anon/authenticated SELECT on base tables (view filters handle row access)
-- These are needed for the security_invoker=on views to work

CREATE POLICY "Anon can read published funds via view" ON public.funds
  FOR SELECT TO anon USING (is_published = true);

CREATE POLICY "Anon can read published news via view" ON public.news_articles
  FOR SELECT TO anon USING (status = 'published');

CREATE POLICY "Anon can read active ads via view" ON public.ads
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Anon can read active rates via view" ON public.exchange_rates
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Anon can read active commodities via view" ON public.commodities
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Anon can read active social links via view" ON public.social_links
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Anon can read site pages via view" ON public.site_pages
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read rate history via view" ON public.exchange_rate_history
  FOR SELECT TO anon USING (true);

-- Authenticated non-admin users also need read access through views
CREATE POLICY "Auth can read published funds via view" ON public.funds
  FOR SELECT TO authenticated USING (is_published = true);

CREATE POLICY "Auth can read published news via view" ON public.news_articles
  FOR SELECT TO authenticated USING (status = 'published');

CREATE POLICY "Auth can read active rates via view" ON public.exchange_rates
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Auth can read active commodities via view" ON public.commodities
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Auth can read active social links via view" ON public.social_links
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Auth can read site pages via view" ON public.site_pages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth can read rate history via view" ON public.exchange_rate_history
  FOR SELECT TO authenticated USING (true);

-- Revoke column-level access to sensitive columns for anon role
REVOKE ALL ON public.funds FROM anon;
REVOKE ALL ON public.news_articles FROM anon;
REVOKE ALL ON public.ads FROM anon;
REVOKE ALL ON public.exchange_rates FROM anon;
REVOKE ALL ON public.commodities FROM anon;
REVOKE ALL ON public.social_links FROM anon;
REVOKE ALL ON public.site_pages FROM anon;

-- Grant SELECT only on non-sensitive columns for anon
GRANT SELECT (id, name, slug, manager, fund_type, description, annual_yield, seven_day_yield, thirty_day_yield, daily_yield, yield_unit, minimum_investment, management_fee, withdrawal_time, website, cma_licensed, fact_sheet_date, is_published, created_at, updated_at) ON public.funds TO anon;

GRANT SELECT (id, title, summary, content, source, date_published, url, category, read_time, is_featured, status, created_at, updated_at) ON public.news_articles TO anon;

GRANT SELECT (id, title, description, media_type, media_url, click_url, placement, start_date, end_date, is_active, created_at, updated_at) ON public.ads TO anon;

GRANT SELECT (id, currency_code, currency_name, rate, previous_rate, sort_order, updated_at, is_active) ON public.exchange_rates TO anon;

GRANT SELECT (id, name, symbol, price, previous_price, unit, sort_order, updated_at, is_active) ON public.commodities TO anon;

GRANT SELECT (id, platform, url, icon_name, sort_order, is_active) ON public.social_links TO anon;

GRANT SELECT (id, slug, title, content, meta, updated_at) ON public.site_pages TO anon;

-- Re-grant view access
GRANT SELECT ON public.funds_public TO anon, authenticated;
GRANT SELECT ON public.news_articles_public TO anon, authenticated;
GRANT SELECT ON public.ads_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rates_public TO anon, authenticated;
GRANT SELECT ON public.commodities_public TO anon, authenticated;
GRANT SELECT ON public.social_links_public TO anon, authenticated;
GRANT SELECT ON public.site_pages_public TO anon, authenticated;
GRANT SELECT ON public.exchange_rate_history_public TO anon, authenticated;
