-- Revoke EXECUTE from anon/authenticated/public on internal SECURITY DEFINER functions.
-- These should only be invoked by triggers (run as table owner) or service_role from edge functions.
-- has_role is intentionally left executable since it is used inside RLS policies.

REVOKE EXECUTE ON FUNCTION public.snapshot_rate_on_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_yield_on_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_commodity_price_on_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_stock_price_on_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_email_unsubscribe_tokens() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;