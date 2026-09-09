-- Timestamped, source-backed observations let the portfolio show an honest
-- rolling movement. They are market data only; no portfolio/user data lives
-- here.
create table public.portfolio_market_quote_observations (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('stock', 'fx', 'commodity')),
  asset_id uuid not null,
  value numeric not null check (value > 0),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index portfolio_market_quote_observations_lookup_idx
  on public.portfolio_market_quote_observations (asset_id, observed_at desc);

alter table public.portfolio_market_quote_observations enable row level security;

-- Quotes are already public through the market-data surfaces. The view keeps
-- the base table private while allowing the client to read only the columns
-- required for an estimate.
create policy "Public can read portfolio market quote observations"
  on public.portfolio_market_quote_observations
  for select to anon, authenticated
  using (true);

create or replace view public.portfolio_market_quote_observations_public
  with (security_invoker = true) as
select asset_type, asset_id, value, observed_at
from public.portfolio_market_quote_observations;

grant select on public.portfolio_market_quote_observations_public to anon, authenticated;
