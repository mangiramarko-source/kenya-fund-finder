-- Migration: Split SELECT policies for anon and authenticated to prevent 'permission denied for function has_role'
-- Fixes RLS error 42501 when anonymous visitors query public views (news_articles_public, funds_public, stocks_public, etc.)

-- 1. funds (is_published = true)
DROP POLICY IF EXISTS "Read funds" ON public.funds;
DROP POLICY IF EXISTS "Anon read published funds" ON public.funds;
DROP POLICY IF EXISTS "Auth read funds" ON public.funds;

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

-- 2. news_articles (status = 'published')
DROP POLICY IF EXISTS "Read news articles" ON public.news_articles;
DROP POLICY IF EXISTS "Anon read published news" ON public.news_articles;
DROP POLICY IF EXISTS "Auth read news" ON public.news_articles;

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

-- 3. ads (is_active = true)
DROP POLICY IF EXISTS "Read ads" ON public.ads;
DROP POLICY IF EXISTS "Anon read active ads" ON public.ads;
DROP POLICY IF EXISTS "Auth read ads" ON public.ads;

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

-- 4. social_links (is_active = true)
DROP POLICY IF EXISTS "Read social links" ON public.social_links;
DROP POLICY IF EXISTS "Anon read active social links" ON public.social_links;
DROP POLICY IF EXISTS "Auth read social links" ON public.social_links;

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

-- 5. admin_posts (is_published = true)
DROP POLICY IF EXISTS "Read admin posts" ON public.admin_posts;
DROP POLICY IF EXISTS "Anon read published admin posts" ON public.admin_posts;
DROP POLICY IF EXISTS "Auth read admin posts" ON public.admin_posts;

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

-- 6. stocks (is_active = true)
DROP POLICY IF EXISTS "Read stocks" ON public.stocks;
DROP POLICY IF EXISTS "Anon read active stocks" ON public.stocks;
DROP POLICY IF EXISTS "Auth read stocks" ON public.stocks;

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

GRANT SELECT (provider_updated_at, quote_source, day_low, day_high)
  ON public.stocks TO anon, authenticated;

-- 7. commodities (is_active = true)
DROP POLICY IF EXISTS "Read commodities" ON public.commodities;
DROP POLICY IF EXISTS "Anon read active commodities" ON public.commodities;
DROP POLICY IF EXISTS "Auth read commodities" ON public.commodities;

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

-- 8. exchange_rates (is_active = true)
DROP POLICY IF EXISTS "Read exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Anon read active rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Auth read rates" ON public.exchange_rates;

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

-- 9. stock_disclosures (extraction_status = 'published')
DROP POLICY IF EXISTS "Read stock disclosures" ON public.stock_disclosures;
DROP POLICY IF EXISTS "Anon read published stock disclosures" ON public.stock_disclosures;
DROP POLICY IF EXISTS "Auth read stock disclosures" ON public.stock_disclosures;

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

-- 10. stock_corporate_actions (parent disclosure extraction_status = 'published')
DROP POLICY IF EXISTS "Read stock corporate actions" ON public.stock_corporate_actions;
DROP POLICY IF EXISTS "Anon read published corporate actions" ON public.stock_corporate_actions;
DROP POLICY IF EXISTS "Auth read corporate actions" ON public.stock_corporate_actions;

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

-- 11. post_comments (scope UPDATE and DELETE explicitly to authenticated so anon never evaluates has_role)
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
