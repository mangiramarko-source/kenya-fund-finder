-- KenyaFundFinder MVP communications foundation.
--
-- This corrective migration is intentionally additive. Production currently
-- lacks the communications tables, while historical/local environments may
-- contain earlier versions of user_watchlist, price_alerts, and notifications.
-- CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS keeps both paths safe.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Core user state
-- ---------------------------------------------------------------------------

create table if not exists public.user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('stock', 'currency', 'commodity', 'fund')),
  item_id text not null,
  item_name text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

alter table public.user_watchlist
  add column if not exists updated_at timestamptz not null default now();

create index if not exists user_watchlist_user_sort_idx
  on public.user_watchlist (user_id, sort_order, created_at);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_id uuid references public.stocks(id) on delete cascade,
  -- Compatibility columns retained for the current client while it migrates to
  -- the stock-only contract.
  asset_type text not null default 'stock',
  asset_id uuid not null,
  asset_name text not null,
  condition text not null check (condition in ('above', 'below')),
  target_price numeric not null check (target_price > 0),
  notify_email boolean not null default true,
  notify_inapp boolean not null default true,
  is_active boolean not null default true,
  is_triggered boolean not null default false,
  trigger_count integer not null default 0 check (trigger_count >= 0),
  baseline_price numeric,
  last_evaluated_at timestamptz,
  triggered_at timestamptz,
  triggered_price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (asset_type = 'stock'),
  check (not is_active or stock_id is not null)
);

alter table public.price_alerts
  add column if not exists stock_id uuid,
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_inapp boolean not null default true,
  add column if not exists trigger_count integer not null default 0,
  add column if not exists baseline_price numeric,
  add column if not exists last_evaluated_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.price_alerts'::regclass
      and conname = 'price_alerts_target_price_positive'
  ) then
    alter table public.price_alerts
      add constraint price_alerts_target_price_positive check (target_price > 0) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.price_alerts'::regclass
      and conname = 'price_alerts_stock_only_mvp'
  ) then
    alter table public.price_alerts
      add constraint price_alerts_stock_only_mvp check (asset_type = 'stock') not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.price_alerts'::regclass
      and conname = 'price_alerts_active_requires_stock'
  ) then
    alter table public.price_alerts
      add constraint price_alerts_active_requires_stock check (not is_active or stock_id is not null) not valid;
  end if;
end
$$;

update public.price_alerts
set stock_id = asset_id
where stock_id is null and asset_type = 'stock';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.price_alerts'::regclass
      and conname = 'price_alerts_stock_id_fkey'
  ) then
    alter table public.price_alerts
      add constraint price_alerts_stock_id_fkey
      foreign key (stock_id) references public.stocks(id) on delete cascade not valid;
  end if;
end
$$;

create unique index if not exists price_alerts_active_unique_idx
  on public.price_alerts (user_id, stock_id, condition, target_price)
  where is_active and triggered_at is null;

create index if not exists price_alerts_evaluator_idx
  on public.price_alerts (is_active, triggered_at, stock_id)
  where is_active and triggered_at is null;

create index if not exists price_alerts_stock_id_idx
  on public.price_alerts (stock_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text,
  title text not null,
  message text not null,
  type text not null default 'price_alert',
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists event_key text;

create unique index if not exists notifications_event_key_idx
  on public.notifications (event_key)
  where event_key is not null;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where not is_read;

-- ---------------------------------------------------------------------------
-- Canonical overview
-- ---------------------------------------------------------------------------

create table if not exists public.market_overviews (
  id uuid primary key default gen_random_uuid(),
  market_date date not null unique,
  status text not null check (status in ('generating', 'ready', 'blocked', 'failed')),
  payload_version smallint not null default 1 check (payload_version = 1),
  generated_at timestamptz,
  source_as_of timestamptz,
  stocks_fresh_at timestamptz,
  fx_fresh_at timestamptz,
  breadth_direction text check (breadth_direction in ('rising', 'falling', 'mixed')),
  gainers_count integer not null default 0 check (gainers_count >= 0),
  losers_count integer not null default 0 check (losers_count >= 0),
  unchanged_count integer not null default 0 check (unchanged_count >= 0),
  validated_stock_count integer not null default 0 check (validated_stock_count >= 0),
  top_gainers jsonb not null default '[]'::jsonb check (jsonb_typeof(top_gainers) = 'array'),
  top_losers jsonb not null default '[]'::jsonb check (jsonb_typeof(top_losers) = 'array'),
  fx_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(fx_snapshot) = 'object'),
  optional_markets jsonb not null default '{}'::jsonb check (jsonb_typeof(optional_markets) = 'object'),
  news_items jsonb not null default '[]'::jsonb check (jsonb_typeof(news_items) = 'array'),
  deterministic_summary text,
  ai_summary text,
  narrative text,
  source_facts jsonb not null default '{}'::jsonb check (jsonb_typeof(source_facts) = 'object'),
  validation_warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_warnings) = 'array'),
  blocked_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(blocked_reasons) = 'array'),
  generation_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(generation_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'ready' or (generated_at is not null and source_as_of is not null and narrative is not null))
);

create index if not exists market_overviews_ready_date_idx
  on public.market_overviews (market_date desc)
  where status = 'ready';

-- ---------------------------------------------------------------------------
-- Preferences, outbox, and suppression
-- ---------------------------------------------------------------------------

create table if not exists public.communication_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  market_brief_email boolean not null default false,
  price_alert_email boolean not null default true,
  price_alert_inapp boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.communication_preferences (user_id, market_brief_email)
select id, false from auth.users
on conflict (user_id) do nothing;

create table if not exists public.communication_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('market_brief', 'price_alert')),
  idempotency_key text not null unique check (length(idempotency_key) between 1 and 256),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  recipient_email text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'retry_wait', 'accepted', 'cancelled', 'failed')),
  delivery_status text not null default 'not_sent'
    check (delivery_status in ('not_sent', 'accepted', 'delivered', 'bounced', 'complained')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  next_attempt_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  provider_message_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz
);

create index if not exists communication_outbox_claim_idx
  on public.communication_outbox (next_attempt_at, created_at)
  where status in ('pending', 'retry_wait', 'processing');

create index if not exists communication_outbox_provider_idx
  on public.communication_outbox (provider_message_id)
  where provider_message_id is not null;

create index if not exists communication_outbox_user_id_idx
  on public.communication_outbox (user_id);

create table if not exists public.communication_suppressions (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null check (email_normalized = lower(btrim(email_normalized))),
  scope text not null check (scope in ('market_brief', 'price_alert', 'all_email')),
  reason text not null check (reason in ('unsubscribe', 'hard_bounce', 'complaint', 'admin')),
  source text not null default 'system',
  created_at timestamptz not null default now(),
  lifted_at timestamptz
);

create unique index if not exists communication_suppressions_active_idx
  on public.communication_suppressions (email_normalized, scope)
  where lifted_at is null;

-- ---------------------------------------------------------------------------
-- Timestamp maintenance
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_watchlist',
    'price_alerts',
    'market_overviews',
    'communication_preferences',
    'communication_outbox'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end
$$;

create or replace function private.create_communication_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.communication_preferences (user_id, market_brief_email)
  values (new.id, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.create_communication_preferences() from public;
drop trigger if exists create_communication_preferences_after_signup on auth.users;
create trigger create_communication_preferences_after_signup
after insert on auth.users
for each row execute function private.create_communication_preferences();

-- ---------------------------------------------------------------------------
-- Atomic service-only contracts
-- ---------------------------------------------------------------------------

create or replace function public.claim_price_alert_event(
  p_alert_id uuid,
  p_triggered_price numeric,
  p_source_observed_at timestamptz default now(),
  p_email_allowed boolean default true
)
returns table (
  alert_id uuid,
  user_id uuid,
  trigger_count integer,
  notification_created boolean,
  outbox_created boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed public.price_alerts%rowtype;
  stock_name text;
  v_event_key text;
  create_notification boolean := false;
  create_outbox boolean := false;
begin
  update public.price_alerts pa
  set is_triggered = true,
      is_active = false,
      trigger_count = pa.trigger_count + 1,
      last_evaluated_at = p_source_observed_at,
      triggered_at = p_source_observed_at,
      triggered_price = p_triggered_price,
      updated_at = now()
  where pa.id = p_alert_id
    and pa.is_active
    and not pa.is_triggered
    and pa.triggered_at is null
    and (
      (pa.condition = 'above' and p_triggered_price >= pa.target_price)
      or (pa.condition = 'below' and p_triggered_price <= pa.target_price)
    )
  returning pa.* into claimed;

  if claimed.id is null then
    return;
  end if;

  select s.name into stock_name
  from public.stocks s
  where s.id = claimed.stock_id;

  v_event_key := format('price_alert:%s:trigger:%s', claimed.id, claimed.trigger_count);

  if claimed.notify_inapp and coalesce((
    select cp.price_alert_inapp
    from public.communication_preferences cp
    where cp.user_id = claimed.user_id
  ), true) then
    insert into public.notifications (user_id, event_key, title, message, type, metadata)
    values (
      claimed.user_id,
      v_event_key,
      format('Price alert: %s', coalesce(stock_name, claimed.asset_name)),
      format(
        '%s is now KES %s, meeting your %s KES %s alert. Data update only — not financial advice.',
        coalesce(stock_name, claimed.asset_name),
        trim(to_char(p_triggered_price, 'FM999999999990D00')),
        claimed.condition,
        trim(to_char(claimed.target_price, 'FM999999999990D00'))
      ),
      'price_alert',
      jsonb_build_object(
        'alert_id', claimed.id,
        'stock_id', claimed.stock_id,
        'condition', claimed.condition,
        'target_price', claimed.target_price,
        'triggered_price', p_triggered_price,
        'trigger_count', claimed.trigger_count,
        'observed_at', p_source_observed_at
      )
    )
    on conflict (event_key) where event_key is not null do nothing;
    create_notification := found;
  end if;

  if p_email_allowed and claimed.notify_email and coalesce((
    select cp.price_alert_email
    from public.communication_preferences cp
    where cp.user_id = claimed.user_id
  ), true) then
    insert into public.communication_outbox (user_id, category, idempotency_key, payload)
    values (
      claimed.user_id,
      'price_alert',
      v_event_key,
      jsonb_build_object(
        'alert_id', claimed.id,
        'stock_id', claimed.stock_id,
        'stock_name', coalesce(stock_name, claimed.asset_name),
        'condition', claimed.condition,
        'target_price', claimed.target_price,
        'triggered_price', p_triggered_price,
        'trigger_count', claimed.trigger_count,
        'observed_at', p_source_observed_at
      )
    )
    on conflict (idempotency_key) do nothing;
    create_outbox := found;
  end if;

  return query select claimed.id, claimed.user_id, claimed.trigger_count, create_notification, create_outbox;
end;
$$;

create or replace function public.claim_communication_batch(
  p_limit integer default 10,
  p_lease_seconds integer default 60
)
returns setof public.communication_outbox
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 50 then
    raise exception 'p_limit must be between 1 and 50';
  end if;
  if p_lease_seconds < 30 or p_lease_seconds > 300 then
    raise exception 'p_lease_seconds must be between 30 and 300';
  end if;

  return query
  with claimable as (
    select co.id
    from public.communication_outbox co
    where co.attempts < 3
      and (
        (co.status in ('pending', 'retry_wait') and co.next_attempt_at <= now())
        or (co.status = 'processing' and co.lease_expires_at < now())
      )
    order by co.next_attempt_at, co.created_at
    for update skip locked
    limit p_limit
  )
  update public.communication_outbox co
  set status = 'processing',
      attempts = co.attempts + 1,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      failure_reason = null,
      updated_at = now()
  from claimable
  where co.id = claimable.id
  returning co.*;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS and explicit Data API grants
-- ---------------------------------------------------------------------------

alter table public.user_watchlist enable row level security;
alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.market_overviews enable row level security;
alter table public.communication_preferences enable row level security;
alter table public.communication_outbox enable row level security;
alter table public.communication_suppressions enable row level security;

drop policy if exists "Users can manage own watchlist" on public.user_watchlist;
create policy "Users can manage own watchlist"
on public.user_watchlist for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own alerts" on public.price_alerts;
create policy "Users can manage own alerts"
on public.price_alerts for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;
drop policy if exists "System can insert notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can update own notifications"
on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Users can delete own notifications"
on public.notifications for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Ready market overviews are public" on public.market_overviews;
create policy "Ready market overviews are public"
on public.market_overviews for select to anon, authenticated
using (status = 'ready');

drop policy if exists "Users can read own communication preferences" on public.communication_preferences;
drop policy if exists "Users can create own communication preferences" on public.communication_preferences;
drop policy if exists "Users can update own communication preferences" on public.communication_preferences;
create policy "Users can read own communication preferences"
on public.communication_preferences for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can update own communication preferences"
on public.communication_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.user_watchlist from anon, authenticated;
revoke all on public.price_alerts from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.market_overviews from anon, authenticated;
revoke all on public.communication_preferences from anon, authenticated;
revoke all on public.communication_outbox from anon, authenticated;
revoke all on public.communication_suppressions from anon, authenticated;

grant select, insert, delete on public.user_watchlist to authenticated;
grant update (item_type, item_id, item_name, sort_order, updated_at) on public.user_watchlist to authenticated;
grant select, delete on public.price_alerts to authenticated;
grant insert (
  user_id, stock_id, asset_type, asset_id, asset_name, condition,
  target_price, notify_email, notify_inapp, is_active, baseline_price
) on public.price_alerts to authenticated;
grant update (
  stock_id, asset_type, asset_id, asset_name, condition, target_price,
  notify_email, notify_inapp, is_active, baseline_price, updated_at
) on public.price_alerts to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant select on public.market_overviews to anon, authenticated;
grant select on public.communication_preferences to authenticated;
grant update (market_brief_email, price_alert_email, price_alert_inapp) on public.communication_preferences to authenticated;

grant all on public.user_watchlist to service_role;
grant all on public.price_alerts to service_role;
grant all on public.notifications to service_role;
grant all on public.market_overviews to service_role;
grant all on public.communication_preferences to service_role;
grant all on public.communication_outbox to service_role;
grant all on public.communication_suppressions to service_role;
-- claim_price_alert_event is SECURITY INVOKER and resolves the stock name
-- directly from the base table, so its service-only caller needs SELECT.
grant select on public.stocks to service_role;

revoke all on function public.claim_price_alert_event(uuid, numeric, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.claim_communication_batch(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_price_alert_event(uuid, numeric, timestamptz, boolean) to service_role;
grant execute on function public.claim_communication_batch(integer, integer) to service_role;

comment on table public.market_overviews is
  'One canonical, freshness-validated Kenya market overview per intended market day.';
comment on table public.communication_outbox is
  'Durable MVP communication events. PGMQ is intentionally not used.';
