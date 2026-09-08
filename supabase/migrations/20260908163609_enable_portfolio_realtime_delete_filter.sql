-- Supabase can only apply the user_id filter to DELETE events when the old
-- row is available in the replication stream. This keeps an open second
-- device in sync immediately when a holding is removed.
alter table public.mock_portfolios replica identity full;
