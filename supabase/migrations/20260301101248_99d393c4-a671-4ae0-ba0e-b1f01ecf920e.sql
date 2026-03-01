
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- ===== funds =====
DROP POLICY IF EXISTS "Anyone can view published funds" ON public.funds;
DROP POLICY IF EXISTS "Admins can manage funds" ON public.funds;

CREATE POLICY "Anyone can view published funds"
  ON public.funds FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage funds"
  ON public.funds FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== news_articles =====
DROP POLICY IF EXISTS "Anyone can view published news" ON public.news_articles;
DROP POLICY IF EXISTS "Admins can manage news" ON public.news_articles;

CREATE POLICY "Anyone can view published news"
  ON public.news_articles FOR SELECT
  USING (status = 'published'::text);

CREATE POLICY "Admins can manage news"
  ON public.news_articles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== fund_historical_yields =====
DROP POLICY IF EXISTS "Anyone can view yields" ON public.fund_historical_yields;
DROP POLICY IF EXISTS "Admins can manage yields" ON public.fund_historical_yields;

CREATE POLICY "Anyone can view yields"
  ON public.fund_historical_yields FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage yields"
  ON public.fund_historical_yields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== page_views =====
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
DROP POLICY IF EXISTS "Admins can read page views" ON public.page_views;

CREATE POLICY "Anyone can insert page views"
  ON public.page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read page views"
  ON public.page_views FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== change_log =====
DROP POLICY IF EXISTS "Admins can view change log" ON public.change_log;
DROP POLICY IF EXISTS "Admins can insert change log" ON public.change_log;

CREATE POLICY "Admins can view change log"
  ON public.change_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert change log"
  ON public.change_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== user_roles =====
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
