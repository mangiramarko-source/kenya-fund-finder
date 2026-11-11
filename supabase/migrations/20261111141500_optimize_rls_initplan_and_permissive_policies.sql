-- Migration: Optimize RLS InitPlan and Eliminate Multiple Permissive Policies
-- Resolves auth_rls_initplan (0003) and multiple_permissive_policies (0006)
-- 1. Unifies SELECT policies into a single policy per table to eliminate redundant evaluations.
-- 2. Preserves admin visibility for rows with status/active filters (e.g. is_published=true OR is_admin).
-- 3. Wraps all auth.uid() and auth.role() calls in (SELECT ...) for Postgres InitPlan query optimization.
-- 4. Fully idempotent: Drops each target policy before creating it.

-- ============================================================================
-- 1. Content & Admin Tables (funds, news_articles, site_pages, ads, social_links, ad_events)
-- ============================================================================

-- funds (admins see all; public reads published via is_published)
DROP POLICY IF EXISTS "Admins can view all funds" ON public.funds;
DROP POLICY IF EXISTS "Auth can read published funds via view" ON public.funds;
DROP POLICY IF EXISTS "Anon can read published funds via view" ON public.funds;
DROP POLICY IF EXISTS "Anyone can view published funds" ON public.funds;
DROP POLICY IF EXISTS "Admins can manage funds" ON public.funds;
DROP POLICY IF EXISTS "Read funds" ON public.funds;
DROP POLICY IF EXISTS "Anon read published funds" ON public.funds;
DROP POLICY IF EXISTS "Auth read funds" ON public.funds;
DROP POLICY IF EXISTS "Admins can insert funds" ON public.funds;
DROP POLICY IF EXISTS "Admins can update funds" ON public.funds;
DROP POLICY IF EXISTS "Admins can delete funds" ON public.funds;

CREATE POLICY "Anon read published funds"
  ON public.funds FOR SELECT
  TO anon
  USING (is_published = true);

CREATE POLICY "Auth read funds"
  ON public.funds FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert funds"
  ON public.funds FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update funds"
  ON public.funds FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete funds"
  ON public.funds FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- news_articles (admins see all; public reads published via status = 'published')
DROP POLICY IF EXISTS "Admins can view all news" ON public.news_articles;
DROP POLICY IF EXISTS "Auth can read published news via view" ON public.news_articles;
DROP POLICY IF EXISTS "Anon can read published news via view" ON public.news_articles;
DROP POLICY IF EXISTS "Anyone can view published news" ON public.news_articles;
DROP POLICY IF EXISTS "Admins can manage news" ON public.news_articles;
DROP POLICY IF EXISTS "Read news articles" ON public.news_articles;
DROP POLICY IF EXISTS "Anon read published news" ON public.news_articles;
DROP POLICY IF EXISTS "Auth read news" ON public.news_articles;
DROP POLICY IF EXISTS "Admins can insert news" ON public.news_articles;
DROP POLICY IF EXISTS "Admins can update news" ON public.news_articles;
DROP POLICY IF EXISTS "Admins can delete news" ON public.news_articles;

CREATE POLICY "Anon read published news"
  ON public.news_articles FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "Auth read news"
  ON public.news_articles FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert news"
  ON public.news_articles FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update news"
  ON public.news_articles FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete news"
  ON public.news_articles FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- site_pages (public reads all; admins write)
DROP POLICY IF EXISTS "Admins can view all site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Auth can read site pages via view" ON public.site_pages;
DROP POLICY IF EXISTS "Auth can read site pages for public view" ON public.site_pages;
DROP POLICY IF EXISTS "Anon can read site pages via view" ON public.site_pages;
DROP POLICY IF EXISTS "Anon can read site pages for public view" ON public.site_pages;
DROP POLICY IF EXISTS "Anyone can view site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Admins can manage site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Read site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Admins can insert site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Admins can update site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Admins can delete site pages" ON public.site_pages;

CREATE POLICY "Read site pages"
  ON public.site_pages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert site pages"
  ON public.site_pages FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update site pages"
  ON public.site_pages FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete site pages"
  ON public.site_pages FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ads (admins see all; public reads active via is_active = true)
DROP POLICY IF EXISTS "Admins can view all ads" ON public.ads;
DROP POLICY IF EXISTS "Auth can read active ads via view" ON public.ads;
DROP POLICY IF EXISTS "Anon can read active ads via view" ON public.ads;
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.ads;
DROP POLICY IF EXISTS "Admins can manage ads" ON public.ads;
DROP POLICY IF EXISTS "Read ads" ON public.ads;
DROP POLICY IF EXISTS "Anon read active ads" ON public.ads;
DROP POLICY IF EXISTS "Auth read ads" ON public.ads;
DROP POLICY IF EXISTS "Admins can insert ads" ON public.ads;
DROP POLICY IF EXISTS "Admins can update ads" ON public.ads;
DROP POLICY IF EXISTS "Admins can delete ads" ON public.ads;

CREATE POLICY "Anon read active ads"
  ON public.ads FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Auth read ads"
  ON public.ads FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert ads"
  ON public.ads FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update ads"
  ON public.ads FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete ads"
  ON public.ads FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ad_events
DROP POLICY IF EXISTS "Admins can read ad events" ON public.ad_events;
CREATE POLICY "Admins can read ad events"
  ON public.ad_events FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete ad events" ON public.ad_events;
CREATE POLICY "Admins can delete ad events"
  ON public.ad_events FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- social_links (admins see all; public reads active via is_active = true)
DROP POLICY IF EXISTS "Admins can view all social links" ON public.social_links;
DROP POLICY IF EXISTS "Auth can read active social links via view" ON public.social_links;
DROP POLICY IF EXISTS "Anon can read active social links via view" ON public.social_links;
DROP POLICY IF EXISTS "Anon can read active social links" ON public.social_links;
DROP POLICY IF EXISTS "Authenticated can read active social links" ON public.social_links;
DROP POLICY IF EXISTS "Admins can manage social links" ON public.social_links;
DROP POLICY IF EXISTS "Read social links" ON public.social_links;
DROP POLICY IF EXISTS "Anon read active social links" ON public.social_links;
DROP POLICY IF EXISTS "Auth read social links" ON public.social_links;
DROP POLICY IF EXISTS "Admins can insert social links" ON public.social_links;
DROP POLICY IF EXISTS "Admins can update social links" ON public.social_links;
DROP POLICY IF EXISTS "Admins can delete social links" ON public.social_links;

CREATE POLICY "Anon read active social links"
  ON public.social_links FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Auth read social links"
  ON public.social_links FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert social links"
  ON public.social_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update social links"
  ON public.social_links FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete social links"
  ON public.social_links FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ============================================================================
-- 2. Admin Posts & Personas
-- ============================================================================

-- admin_personas (everyone reads; admins write)
DROP POLICY IF EXISTS "Admin personas public read" ON public.admin_personas;
DROP POLICY IF EXISTS "Admins can manage personas" ON public.admin_personas;
DROP POLICY IF EXISTS "Admins can insert personas" ON public.admin_personas;
DROP POLICY IF EXISTS "Admins can update personas" ON public.admin_personas;
DROP POLICY IF EXISTS "Admins can delete personas" ON public.admin_personas;

CREATE POLICY "Admin personas public read"
  ON public.admin_personas FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert personas"
  ON public.admin_personas FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update personas"
  ON public.admin_personas FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete personas"
  ON public.admin_personas FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- admin_posts (consolidate SELECT into split policies; admins write via separate policies)
DROP POLICY IF EXISTS "Published admin posts public read" ON public.admin_posts;
DROP POLICY IF EXISTS "Admins can view all posts" ON public.admin_posts;
DROP POLICY IF EXISTS "Admins can manage posts" ON public.admin_posts;
DROP POLICY IF EXISTS "Read admin posts" ON public.admin_posts;
DROP POLICY IF EXISTS "Anon read published admin posts" ON public.admin_posts;
DROP POLICY IF EXISTS "Auth read admin posts" ON public.admin_posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON public.admin_posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.admin_posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.admin_posts;

CREATE POLICY "Anon read published admin posts"
  ON public.admin_posts FOR SELECT
  TO anon
  USING (is_published = true);

CREATE POLICY "Auth read admin posts"
  ON public.admin_posts FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert posts"
  ON public.admin_posts FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update posts"
  ON public.admin_posts FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete posts"
  ON public.admin_posts FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ============================================================================
-- 3. Market Data & Yield History Tables
-- ============================================================================

-- stock_price_history (public reads via USING true; admins write)
DROP POLICY IF EXISTS "Anyone can view stock price history" ON public.stock_price_history;
DROP POLICY IF EXISTS "Admins can manage stock price history" ON public.stock_price_history;
DROP POLICY IF EXISTS "Read stock price history" ON public.stock_price_history;
DROP POLICY IF EXISTS "Admins can insert stock price history" ON public.stock_price_history;
DROP POLICY IF EXISTS "Admins can update stock price history" ON public.stock_price_history;
DROP POLICY IF EXISTS "Admins can delete stock price history" ON public.stock_price_history;

CREATE POLICY "Read stock price history"
  ON public.stock_price_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert stock price history"
  ON public.stock_price_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update stock price history"
  ON public.stock_price_history FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete stock price history"
  ON public.stock_price_history FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- commodity_price_history (public reads via USING true; admins write)
DROP POLICY IF EXISTS "Anyone can view commodity price history" ON public.commodity_price_history;
DROP POLICY IF EXISTS "Admins can manage commodity price history" ON public.commodity_price_history;
DROP POLICY IF EXISTS "Read commodity price history" ON public.commodity_price_history;
DROP POLICY IF EXISTS "Admins can insert commodity price history" ON public.commodity_price_history;
DROP POLICY IF EXISTS "Admins can update commodity price history" ON public.commodity_price_history;
DROP POLICY IF EXISTS "Admins can delete commodity price history" ON public.commodity_price_history;

CREATE POLICY "Read commodity price history"
  ON public.commodity_price_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert commodity price history"
  ON public.commodity_price_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update commodity price history"
  ON public.commodity_price_history FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete commodity price history"
  ON public.commodity_price_history FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- fund_historical_yields (public reads via USING true; admins write)
DROP POLICY IF EXISTS "Anyone can view yields" ON public.fund_historical_yields;
DROP POLICY IF EXISTS "Admins can manage yields" ON public.fund_historical_yields;
DROP POLICY IF EXISTS "Read fund historical yields" ON public.fund_historical_yields;
DROP POLICY IF EXISTS "Admins can insert yields" ON public.fund_historical_yields;
DROP POLICY IF EXISTS "Admins can update yields" ON public.fund_historical_yields;
DROP POLICY IF EXISTS "Admins can delete yields" ON public.fund_historical_yields;

CREATE POLICY "Read fund historical yields"
  ON public.fund_historical_yields FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert yields"
  ON public.fund_historical_yields FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update yields"
  ON public.fund_historical_yields FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete yields"
  ON public.fund_historical_yields FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- fund_yield_snapshots (public reads via USING true; admins write)
DROP POLICY IF EXISTS "Anyone can view yield snapshots" ON public.fund_yield_snapshots;
DROP POLICY IF EXISTS "Admins can manage yield snapshots" ON public.fund_yield_snapshots;
DROP POLICY IF EXISTS "Read fund yield snapshots" ON public.fund_yield_snapshots;
DROP POLICY IF EXISTS "Admins can insert yield snapshots" ON public.fund_yield_snapshots;
DROP POLICY IF EXISTS "Admins can update yield snapshots" ON public.fund_yield_snapshots;
DROP POLICY IF EXISTS "Admins can delete yield snapshots" ON public.fund_yield_snapshots;

CREATE POLICY "Read fund yield snapshots"
  ON public.fund_yield_snapshots FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert yield snapshots"
  ON public.fund_yield_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update yield snapshots"
  ON public.fund_yield_snapshots FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete yield snapshots"
  ON public.fund_yield_snapshots FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- exchange_rate_history (unified single SELECT policy; admins write)
DROP POLICY IF EXISTS "Anon can read rate history" ON public.exchange_rate_history;
DROP POLICY IF EXISTS "Authenticated can read rate history" ON public.exchange_rate_history;
DROP POLICY IF EXISTS "Anon can read rate history via view" ON public.exchange_rate_history;
DROP POLICY IF EXISTS "Auth can read rate history via view" ON public.exchange_rate_history;
DROP POLICY IF EXISTS "Admins can manage rate history" ON public.exchange_rate_history;
DROP POLICY IF EXISTS "Read exchange rate history" ON public.exchange_rate_history;
DROP POLICY IF EXISTS "Admins can insert rate history" ON public.exchange_rate_history;
DROP POLICY IF EXISTS "Admins can update rate history" ON public.exchange_rate_history;
DROP POLICY IF EXISTS "Admins can delete rate history" ON public.exchange_rate_history;

CREATE POLICY "Read exchange rate history"
  ON public.exchange_rate_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert rate history"
  ON public.exchange_rate_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update rate history"
  ON public.exchange_rate_history FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete rate history"
  ON public.exchange_rate_history FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- stocks (preserves admin access to inactive stocks; public reads active via is_active = true)
DROP POLICY IF EXISTS "Anon can read active stocks" ON public.stocks;
DROP POLICY IF EXISTS "Auth can read active stocks" ON public.stocks;
DROP POLICY IF EXISTS "Admins can manage stocks" ON public.stocks;
DROP POLICY IF EXISTS "Read stocks" ON public.stocks;
DROP POLICY IF EXISTS "Anon read active stocks" ON public.stocks;
DROP POLICY IF EXISTS "Auth read stocks" ON public.stocks;
DROP POLICY IF EXISTS "Admins can insert stocks" ON public.stocks;
DROP POLICY IF EXISTS "Admins can update stocks" ON public.stocks;
DROP POLICY IF EXISTS "Admins can delete stocks" ON public.stocks;

CREATE POLICY "Anon read active stocks"
  ON public.stocks FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Auth read stocks"
  ON public.stocks FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert stocks"
  ON public.stocks FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update stocks"
  ON public.stocks FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete stocks"
  ON public.stocks FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

GRANT SELECT (provider_updated_at, quote_source, day_low, day_high)
  ON public.stocks TO anon, authenticated;

-- commodities (preserves admin access to inactive commodities; public reads active via is_active = true)
DROP POLICY IF EXISTS "Anyone can view active commodities" ON public.commodities;
DROP POLICY IF EXISTS "Anon can view active commodities" ON public.commodities;
DROP POLICY IF EXISTS "Authenticated can view active commodities" ON public.commodities;
DROP POLICY IF EXISTS "Anon can read active commodities via view" ON public.commodities;
DROP POLICY IF EXISTS "Auth can read active commodities via view" ON public.commodities;
DROP POLICY IF EXISTS "Admins can manage commodities" ON public.commodities;
DROP POLICY IF EXISTS "Read commodities" ON public.commodities;
DROP POLICY IF EXISTS "Anon read active commodities" ON public.commodities;
DROP POLICY IF EXISTS "Auth read commodities" ON public.commodities;
DROP POLICY IF EXISTS "Admins can insert commodities" ON public.commodities;
DROP POLICY IF EXISTS "Admins can update commodities" ON public.commodities;
DROP POLICY IF EXISTS "Admins can delete commodities" ON public.commodities;

CREATE POLICY "Anon read active commodities"
  ON public.commodities FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Auth read commodities"
  ON public.commodities FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert commodities"
  ON public.commodities FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update commodities"
  ON public.commodities FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete commodities"
  ON public.commodities FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- exchange_rates (preserves admin access to inactive rates; public reads active via is_active = true)
DROP POLICY IF EXISTS "Anyone can view active rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Anon can view active rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Authenticated can view active rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Anon can read active rates via view" ON public.exchange_rates;
DROP POLICY IF EXISTS "Auth can read active rates via view" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admins can manage rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Read exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Anon read active rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Auth read rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admins can insert rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admins can update rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admins can delete rates" ON public.exchange_rates;

CREATE POLICY "Anon read active rates"
  ON public.exchange_rates FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Auth read rates"
  ON public.exchange_rates FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert rates"
  ON public.exchange_rates FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update rates"
  ON public.exchange_rates FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete rates"
  ON public.exchange_rates FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- stock_disclosures (preserves admin access to unpublished disclosures; public reads published via extraction_status = 'published')
DROP POLICY IF EXISTS "Public reads published disclosures" ON public.stock_disclosures;
DROP POLICY IF EXISTS "Admins manage disclosures" ON public.stock_disclosures;
DROP POLICY IF EXISTS "Read stock disclosures" ON public.stock_disclosures;
DROP POLICY IF EXISTS "Anon read published stock disclosures" ON public.stock_disclosures;
DROP POLICY IF EXISTS "Auth read stock disclosures" ON public.stock_disclosures;
DROP POLICY IF EXISTS "Admins can insert disclosures" ON public.stock_disclosures;
DROP POLICY IF EXISTS "Admins can update disclosures" ON public.stock_disclosures;
DROP POLICY IF EXISTS "Admins can delete disclosures" ON public.stock_disclosures;

CREATE POLICY "Anon read published stock disclosures"
  ON public.stock_disclosures FOR SELECT
  TO anon
  USING (extraction_status = 'published');

CREATE POLICY "Auth read stock disclosures"
  ON public.stock_disclosures FOR SELECT
  TO authenticated
  USING (
    extraction_status = 'published'
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert disclosures"
  ON public.stock_disclosures FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update disclosures"
  ON public.stock_disclosures FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete disclosures"
  ON public.stock_disclosures FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- stock_corporate_actions (preserves admin access; public reads published via parent extraction_status = 'published')
DROP POLICY IF EXISTS "Public reads published corporate actions" ON public.stock_corporate_actions;
DROP POLICY IF EXISTS "Admins manage corporate actions" ON public.stock_corporate_actions;
DROP POLICY IF EXISTS "Read stock corporate actions" ON public.stock_corporate_actions;
DROP POLICY IF EXISTS "Anon read published corporate actions" ON public.stock_corporate_actions;
DROP POLICY IF EXISTS "Auth read corporate actions" ON public.stock_corporate_actions;
DROP POLICY IF EXISTS "Admins can insert corporate actions" ON public.stock_corporate_actions;
DROP POLICY IF EXISTS "Admins can update corporate actions" ON public.stock_corporate_actions;
DROP POLICY IF EXISTS "Admins can delete corporate actions" ON public.stock_corporate_actions;

CREATE POLICY "Anon read published corporate actions"
  ON public.stock_corporate_actions FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_disclosures disclosure
      WHERE disclosure.id = disclosure_id
        AND disclosure.extraction_status = 'published'
    )
  );

CREATE POLICY "Auth read corporate actions"
  ON public.stock_corporate_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_disclosures disclosure
      WHERE disclosure.id = disclosure_id
        AND disclosure.extraction_status = 'published'
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert corporate actions"
  ON public.stock_corporate_actions FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update corporate actions"
  ON public.stock_corporate_actions FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete corporate actions"
  ON public.stock_corporate_actions FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- stock_disclosure_sources
DROP POLICY IF EXISTS "Admins manage disclosure sources" ON public.stock_disclosure_sources;
CREATE POLICY "Admins manage disclosure sources"
  ON public.stock_disclosure_sources FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ============================================================================
-- 4. User Profiles & Roles
-- ============================================================================

-- profiles: Combine user + admin access into clean per-action policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Read profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Update profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Read profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Insert profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Update profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- user_roles: Combine user + admin access
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Read user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

CREATE POLICY "Read user roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert user roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ============================================================================
-- 5. Activity, Audits & Analytics (page_views, auth_gate_clicks, rate_limit_hits, change_log)
-- ============================================================================

-- page_views
DROP POLICY IF EXISTS "Admins can read page views" ON public.page_views;
CREATE POLICY "Admins can read page views"
  ON public.page_views FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Authenticated users can insert own page views" ON public.page_views;
CREATE POLICY "Authenticated users can insert own page views"
  ON public.page_views FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

-- auth_gate_clicks
DROP POLICY IF EXISTS "Admins can read auth gate clicks" ON public.auth_gate_clicks;
CREATE POLICY "Admins can read auth gate clicks"
  ON public.auth_gate_clicks FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- rate_limit_hits
DROP POLICY IF EXISTS "Admins can read rate limit hits" ON public.rate_limit_hits;
CREATE POLICY "Admins can read rate limit hits"
  ON public.rate_limit_hits FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- change_log
DROP POLICY IF EXISTS "Admins can view change log" ON public.change_log;
CREATE POLICY "Admins can view change log"
  ON public.change_log FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert change log" ON public.change_log;
CREATE POLICY "Admins can insert change log"
  ON public.change_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ============================================================================
-- 6. Social Feed Interactions (post_likes, post_comments)
-- ============================================================================

-- post_likes
DROP POLICY IF EXISTS "Authenticated users can insert likes" ON public.post_likes;
CREATE POLICY "Authenticated users can insert likes"
  ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = (SELECT auth.uid())
    AND guest_hash IS NULL
  );

DROP POLICY IF EXISTS "Authenticated users can delete their own likes or admins can moderate" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can delete their own likes or admins can mo" ON public.post_likes;
CREATE POLICY "Authenticated users can delete their own likes or admins can moderate"
  ON public.post_likes FOR DELETE TO authenticated
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
    OR
    ((SELECT auth.uid()) IS NOT NULL AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  );

-- post_comments
DROP POLICY IF EXISTS "Users and guests can insert comments" ON public.post_comments;
CREATE POLICY "Users and guests can insert comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
    OR
    ((SELECT auth.uid()) IS NULL AND user_id IS NULL)
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
CREATE POLICY "Users can update their own comments"
  ON public.post_comments FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own comments or admins can moderate" ON public.post_comments;
CREATE POLICY "Users can delete their own comments or admins can moderate"
  ON public.post_comments FOR DELETE TO authenticated
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
    OR
    ((SELECT auth.uid()) IS NOT NULL AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  );

-- ============================================================================
-- 7. Treasury Update Runs
-- ============================================================================

DROP POLICY IF EXISTS "Enable read access for service_role and authenticated users" ON public.treasury_update_runs;
DROP POLICY IF EXISTS "Enable insert access for service_role only" ON public.treasury_update_runs;
DROP POLICY IF EXISTS "Enable update access for service_role only" ON public.treasury_update_runs;

CREATE POLICY "Enable read access for service_role and authenticated users"
  ON public.treasury_update_runs FOR SELECT
  USING (
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.role()) = 'authenticated'
  );

CREATE POLICY "Enable insert access for service_role only"
  ON public.treasury_update_runs FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Enable update access for service_role only"
  ON public.treasury_update_runs FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
