-- Migration: Revoke direct RPC execute grants on internal database triggers
-- Description: Trigger functions run automatically via Postgres table triggers (SECURITY DEFINER).
-- They must not be exposed as public web RPC endpoints (/rest/v1/rpc/...) to anon or authenticated roles.
-- Keeps service_role and postgres privileges intact.
-- Uses to_regprocedure(...) guards so it is safe across clean and existing environments.

DO $$
BEGIN
  IF to_regprocedure('public.enforce_post_comment_security()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.enforce_post_comment_security() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.enforce_post_comment_security() TO service_role';
  END IF;

  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role';
  END IF;

  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role';
  END IF;

  IF to_regprocedure('public.snapshot_commodity_price_on_update()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.snapshot_commodity_price_on_update() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.snapshot_commodity_price_on_update() TO service_role';
  END IF;

  IF to_regprocedure('public.snapshot_rate_on_update()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.snapshot_rate_on_update() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.snapshot_rate_on_update() TO service_role';
  END IF;

  IF to_regprocedure('public.snapshot_stock_price_on_update()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.snapshot_stock_price_on_update() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.snapshot_stock_price_on_update() TO service_role';
  END IF;

  IF to_regprocedure('public.snapshot_yield_on_update()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.snapshot_yield_on_update() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.snapshot_yield_on_update() TO service_role';
  END IF;

  IF to_regprocedure('public.trigger_enrich_news_article()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.trigger_enrich_news_article() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.trigger_enrich_news_article() TO service_role';
  END IF;
END
$$;
