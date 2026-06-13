
-- 1) Allow anonymous page-view inserts (user_id must be NULL)
CREATE POLICY "Anonymous users can insert anon page views"
ON public.page_views
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- 2) Revoke anonymous EXECUTE on user-scoped SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.backfill_my_portfolio_asset_ids() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_my_portfolio_asset_ids() TO authenticated;
