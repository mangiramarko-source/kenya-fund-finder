-- Tighten page_views: drop permissive anon insert, restrict authenticated insert
DROP POLICY IF EXISTS "Authenticated users can insert page views" ON public.page_views;
DROP POLICY IF EXISTS "Anon can insert page views without user_id" ON public.page_views;

CREATE POLICY "Authenticated users can insert own page views"
  ON public.page_views FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Tighten auth_gate_clicks: restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can insert auth gate clicks" ON public.auth_gate_clicks;

CREATE POLICY "Authenticated users can insert auth gate clicks"
  ON public.auth_gate_clicks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);