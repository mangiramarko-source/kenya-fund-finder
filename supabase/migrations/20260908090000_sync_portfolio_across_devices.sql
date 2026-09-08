-- Keep the source identifier of a guest holding after it is imported.  This
-- makes an interrupted import safe to retry without merging real portfolio lots.
alter table public.mock_portfolios
  add column if not exists client_source_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mock_portfolios'::regclass
      and conname = 'mock_portfolios_user_client_source_id_key'
  ) then
    alter table public.mock_portfolios
      add constraint mock_portfolios_user_client_source_id_key
      unique (user_id, client_source_id);
  end if;
end;
$$;

-- Signed-in clients subscribe only to their own rows (enforced by the table's
-- existing RLS policy) so another active device can refresh immediately.
alter publication supabase_realtime add table public.mock_portfolios;
