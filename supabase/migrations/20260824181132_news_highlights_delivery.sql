-- Canonical, deterministic weekday News Highlights editions.
-- This migration intentionally creates no cron jobs or outbound messages.

create table public.news_highlights_editions (
  id uuid primary key default gen_random_uuid(),
  edition_date date not null unique,
  status text not null default 'building'
    check (status in ('building', 'ready', 'skipped', 'failed')),
  source_window_start timestamptz not null,
  source_window_end timestamptz not null,
  selected_articles jsonb not null default '[]'::jsonb
    check (jsonb_typeof(selected_articles) = 'array'),
  insights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(insights) = 'array'),
  company_watch jsonb not null default '[]'::jsonb
    check (jsonb_typeof(company_watch) = 'array'),
  policy_watch jsonb not null default '[]'::jsonb
    check (jsonb_typeof(policy_watch) = 'array'),
  featured_story jsonb,
  diagnostics jsonb not null default '{}'::jsonb
    check (jsonb_typeof(diagnostics) = 'object'),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_window_start < source_window_end),
  check (
    status <> 'ready' or (
      jsonb_array_length(selected_articles) between 3 and 5
      and featured_story is not null
    )
  )
);

create index news_highlights_editions_ready_date_idx
  on public.news_highlights_editions (edition_date desc)
  where status = 'ready';

alter table public.news_highlights_editions enable row level security;
revoke all on public.news_highlights_editions from anon, authenticated;
grant all on public.news_highlights_editions to service_role;

create trigger set_news_highlights_editions_updated_at
before update on public.news_highlights_editions
for each row execute function private.set_updated_at();

alter table public.communication_outbox
  drop constraint communication_outbox_category_check;
alter table public.communication_outbox
  add constraint communication_outbox_category_check
  check (category in ('market_brief', 'price_alert', 'news_highlights'));

-- Keep the original generic claim RPC unchanged for existing callers. This
-- category-specific lease claim prevents the 06:00 worker from processing
-- price-alert or Market Brief rows.
create or replace function public.claim_communication_category_batch(
  p_category text,
  p_limit integer default 10,
  p_lease_seconds integer default 60
)
returns setof public.communication_outbox
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_category not in ('market_brief', 'price_alert', 'news_highlights') then
    raise exception 'Unsupported communication category';
  end if;
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
    where co.category = p_category
      and co.attempts < 3
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

revoke all on function public.claim_communication_category_batch(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_communication_category_batch(text, integer, integer)
  to service_role;

comment on table public.news_highlights_editions is
  'One immutable, deterministic stored-news edition per weekday Nairobi date. No scheduler is created by this migration.';
