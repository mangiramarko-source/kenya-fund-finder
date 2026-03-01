
-- Remove the overly permissive "Anyone can read profiles" policy
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

-- Remove the overly permissive "Anyone can insert page views" policy
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;

-- Add a more restrictive page_views INSERT policy requiring authenticated or matching session
CREATE POLICY "Authenticated users can insert page views"
  ON public.page_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anon inserts but only with null user_id
CREATE POLICY "Anon can insert page views without user_id"
  ON public.page_views FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
