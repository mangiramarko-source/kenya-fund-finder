REVOKE EXECUTE ON FUNCTION public.bulk_sync_funds(jsonb, boolean, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revert_last_bulk_sync() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fund_snapshot_days_in_range(date, date) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bulk_sync_funds(jsonb, boolean, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_last_bulk_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fund_snapshot_days_in_range(date, date) TO authenticated;