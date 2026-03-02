-- Allow anonymous inserts into page_views where user_id is null (for edge function using service role)
-- No change needed: service role bypasses RLS entirely.
-- But we need a permissive policy so the edge function's service role insert works.
-- Actually service role bypasses RLS, so no migration needed.
-- Instead, let's ensure the config.toml has the function registered.
SELECT 1;
