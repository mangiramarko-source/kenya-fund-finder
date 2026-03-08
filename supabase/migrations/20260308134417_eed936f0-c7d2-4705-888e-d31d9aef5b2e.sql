-- ============================================================
-- FIX 1: Convert access-granting RESTRICTIVE policies to PERMISSIVE
-- ============================================================

-- funds: public read
DROP POLICY IF EXISTS "Anyone can view published funds" ON public.funds;
CREATE POLICY "Anyone can view published funds" ON public.funds FOR SELECT USING (is_published = true);

-- funds: admin manage (keep restrictive is fine since admin also matches the permissive above)
-- Actually admin ALL needs to be permissive too so admins can access unpublished funds
DROP POLICY IF EXISTS "Admins can manage funds" ON public.funds;
CREATE POLICY "Admins can manage funds" ON public.funds FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- fund_historical_yields
DROP POLICY IF EXISTS "Anyone can view yields" ON public.fund_historical_yields;
CREATE POLICY "Anyone can view yields" ON public.fund_historical_yields FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage yields" ON public.fund_historical_yields;
CREATE POLICY "Admins can manage yields" ON public.fund_historical_yields FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- fund_yield_snapshots
DROP POLICY IF EXISTS "Anyone can view yield snapshots" ON public.fund_yield_snapshots;
CREATE POLICY "Anyone can view yield snapshots" ON public.fund_yield_snapshots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage yield snapshots" ON public.fund_yield_snapshots;
CREATE POLICY "Admins can manage yield snapshots" ON public.fund_yield_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- news_articles
DROP POLICY IF EXISTS "Anyone can view published news" ON public.news_articles;
CREATE POLICY "Anyone can view published news" ON public.news_articles FOR SELECT USING (status = 'published'::text);

DROP POLICY IF EXISTS "Admins can manage news" ON public.news_articles;
CREATE POLICY "Admins can manage news" ON public.news_articles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- site_pages
DROP POLICY IF EXISTS "Anyone can view site pages" ON public.site_pages;
CREATE POLICY "Anyone can view site pages" ON public.site_pages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage site pages" ON public.site_pages;
CREATE POLICY "Admins can manage site pages" ON public.site_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- page_views
DROP POLICY IF EXISTS "Admins can read page views" ON public.page_views;
CREATE POLICY "Admins can read page views" ON public.page_views FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert own page views" ON public.page_views;
CREATE POLICY "Authenticated users can insert own page views" ON public.page_views FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- auth_gate_clicks
DROP POLICY IF EXISTS "Admins can read auth gate clicks" ON public.auth_gate_clicks;
CREATE POLICY "Admins can read auth gate clicks" ON public.auth_gate_clicks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- change_log
DROP POLICY IF EXISTS "Admins can view change log" ON public.change_log;
CREATE POLICY "Admins can view change log" ON public.change_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert change log" ON public.change_log;
CREATE POLICY "Admins can insert change log" ON public.change_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- rate_limit_hits
DROP POLICY IF EXISTS "Admins can read rate limit hits" ON public.rate_limit_hits;
CREATE POLICY "Admins can read rate limit hits" ON public.rate_limit_hits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));