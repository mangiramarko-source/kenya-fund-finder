
-- Restore anon SELECT policies on base tables for security_invoker views
CREATE POLICY "Anon can read published funds"
  ON public.funds FOR SELECT TO anon USING (is_published = true);

CREATE POLICY "Anon can read published news"
  ON public.news_articles FOR SELECT TO anon USING (status = 'published');

CREATE POLICY "Anon can read site pages"
  ON public.site_pages FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read active ads"
  ON public.ads FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Anon can view active rates"
  ON public.exchange_rates FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Anon can view active commodities"
  ON public.commodities FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Anon can read rate history"
  ON public.exchange_rate_history FOR SELECT TO anon USING (true);

-- Also allow anon to insert ad events (impressions/clicks tracking)
DROP POLICY IF EXISTS "Anyone can insert ad events" ON public.ad_events;
CREATE POLICY "Anyone can insert ad events"
  ON public.ad_events FOR INSERT TO anon, authenticated
  WITH CHECK (event_type IN ('impression', 'click') AND ad_id IS NOT NULL);

-- Allow anon to read fund yield snapshots (for trend indicators)
DROP POLICY IF EXISTS "Anyone can view yield snapshots" ON public.fund_yield_snapshots;
CREATE POLICY "Anyone can view yield snapshots"
  ON public.fund_yield_snapshots FOR SELECT TO anon, authenticated USING (true);

-- Allow anon to read fund historical yields
DROP POLICY IF EXISTS "Anyone can view yields" ON public.fund_historical_yields;
CREATE POLICY "Anyone can view yields"
  ON public.fund_historical_yields FOR SELECT TO anon, authenticated USING (true);
