-- Remove public SELECT policies from base tables (public reads go through views)
DROP POLICY IF EXISTS "Anyone can view published funds" ON public.funds;
DROP POLICY IF EXISTS "Anyone can view published news" ON public.news_articles;
DROP POLICY IF EXISTS "Anyone can view site pages" ON public.site_pages;
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.ads;

-- Create a safe public view for ads (excluding internal columns)
CREATE OR REPLACE VIEW public.ads_public WITH (security_invoker = true) AS
  SELECT id, title, description, media_type, media_url, click_url, placement, start_date, end_date
  FROM public.ads
  WHERE is_active = true;

-- Re-add SELECT policies scoped to admins only on base tables
CREATE POLICY "Admins can view all funds"
  ON public.funds FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all news"
  ON public.news_articles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all site pages"
  ON public.site_pages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all ads"
  ON public.ads FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));