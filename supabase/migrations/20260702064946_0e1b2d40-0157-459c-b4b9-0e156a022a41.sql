
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
-- verify_api_key existed only in some production histories. Keep the hardening
-- when it is present without making a clean migration replay depend on it.
DO $$
BEGIN
  IF to_regprocedure('public.verify_api_key(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.verify_api_key(text) FROM anon, public';
  END IF;
END
$$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_email_unsubscribe_tokens() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, public;
-- These queue wake-up helpers also existed only in some production histories.
DO $$
BEGIN
  IF to_regprocedure('public.email_queue_dispatch()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, public';
  END IF;
  IF to_regprocedure('public.email_queue_wake()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, public';
  END IF;
END
$$;
REVOKE EXECUTE ON FUNCTION public.bulk_sync_funds(jsonb, boolean, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revert_last_bulk_sync() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.backfill_my_portfolio_asset_ids() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fund_snapshot_days_in_range(date, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.snapshot_yield_on_update() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.snapshot_rate_on_update() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.snapshot_stock_price_on_update() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.snapshot_commodity_price_on_update() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
