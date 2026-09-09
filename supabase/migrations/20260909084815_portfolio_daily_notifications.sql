-- Server-owned snapshots support market-only daily portfolio performance.
create table if not exists public.portfolio_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_value numeric not null check (total_value >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create table if not exists public.portfolio_daily_holding_snapshots (
  snapshot_id uuid not null references public.portfolio_daily_snapshots(id) on delete cascade,
  portfolio_holding_id uuid not null,
  asset_name text not null,
  units numeric not null check (units >= 0),
  value numeric not null check (value >= 0),
  created_at timestamptz not null default now(),
  primary key (snapshot_id, portfolio_holding_id)
);

create index if not exists portfolio_daily_snapshots_user_date_idx
  on public.portfolio_daily_snapshots (user_id, snapshot_date desc);

alter table public.portfolio_daily_snapshots enable row level security;
alter table public.portfolio_daily_holding_snapshots enable row level security;
revoke all on table public.portfolio_daily_snapshots, public.portfolio_daily_holding_snapshots from anon, authenticated;

-- The job is authenticated with the named `automations` Vault secret used by
-- existing server jobs. PostgreSQL cron is UTC; 14:15 UTC is 17:15 EAT.
do $$
begin
  begin perform cron.unschedule('portfolio-daily-summary'); exception when others then null; end;
end;
$$;

select cron.schedule(
  'portfolio-daily-summary',
  '15 14 * * 1-5',
  format($job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/create-portfolio-daily-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
      ),
      body := '{}'::jsonb
    );
  $job$)
);
