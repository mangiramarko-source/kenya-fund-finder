-- Canonical identity layer for natural-language queries. Market facts remain in
-- their existing source tables; this catalog stores only stable identity,
-- taxonomy, aliases, and relationships.

create table public.financial_entities (
  id text primary key,
  kind text not null check (kind in ('stock', 'fund', 'fx', 'commodity', 'brand', 'news_topic', 'calculator', 'portfolio', 'market_topic')),
  subtype text,
  display_label text not null check (char_length(display_label) between 1 and 160),
  short_label text,
  source_table text check (source_table is null or source_table in ('funds', 'stocks', 'exchange_rates', 'commodities')),
  source_id uuid,
  source_key text not null,
  manager text,
  market text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create table public.financial_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id text not null references public.financial_entities(id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 160),
  alias_normalized text not null check (char_length(alias_normalized) between 1 and 160),
  origin text not null default 'catalog' check (origin in ('catalog', 'admin_review', 'import')),
  is_approved boolean not null default true,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (entity_id, alias_normalized)
);

create index financial_entity_aliases_normalized_idx
  on public.financial_entity_aliases (alias_normalized)
  where is_approved;

create table public.financial_entity_relations (
  id uuid primary key default gen_random_uuid(),
  from_entity_id text not null references public.financial_entities(id) on delete cascade,
  to_entity_id text not null references public.financial_entities(id) on delete cascade,
  relation_type text not null check (relation_type in ('manages', 'managed_by', 'related_to', 'covers')),
  created_at timestamptz not null default now(),
  unique (from_entity_id, to_entity_id, relation_type),
  check (from_entity_id <> to_entity_id)
);

create index financial_entity_relations_to_idx on public.financial_entity_relations (to_entity_id);

create table public.query_resolution_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  contract_version smallint not null default 1 check (contract_version = 1),
  resolver_version text not null check (char_length(resolver_version) between 1 and 40),
  anonymous_hash text check (anonymous_hash is null or char_length(anonymous_hash) = 64),
  query_pattern text not null check (char_length(query_pattern) between 1 and 320),
  semantic_frame jsonb not null default '{}'::jsonb,
  outcome text not null check (outcome in ('resolved', 'ambiguous', 'not_found', 'clarification_selected', 'shadow_disagreement', 'wrong_resolution')),
  candidate_ids text[] not null default '{}',
  selected_entity_id text references public.financial_entities(id) on delete set null,
  shadow_result jsonb,
  review_status text not null default 'pending' check (review_status in ('pending', 'reviewed', 'ignored')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 1000)
);

create index query_resolution_events_review_queue_idx
  on public.query_resolution_events (review_status, occurred_at desc)
  where review_status = 'pending';

alter table public.financial_entities enable row level security;
alter table public.financial_entity_aliases enable row level security;
alter table public.financial_entity_relations enable row level security;
alter table public.query_resolution_events enable row level security;

create policy "Public can read active financial entities"
  on public.financial_entities for select to anon, authenticated
  using (is_active);
create policy "Admins can insert financial entities"
  on public.financial_entities for insert to authenticated
  with check ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins can update financial entities"
  on public.financial_entities for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')))
  with check ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins can delete financial entities"
  on public.financial_entities for delete to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

create policy "Public can read approved financial aliases"
  on public.financial_entity_aliases for select to anon, authenticated
  using (is_approved);
create policy "Admins can insert financial aliases"
  on public.financial_entity_aliases for insert to authenticated
  with check ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins can update financial aliases"
  on public.financial_entity_aliases for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')))
  with check ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins can delete financial aliases"
  on public.financial_entity_aliases for delete to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

create policy "Public can read financial entity relations"
  on public.financial_entity_relations for select to anon, authenticated
  using (true);
create policy "Admins can insert financial entity relations"
  on public.financial_entity_relations for insert to authenticated
  with check ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins can delete financial entity relations"
  on public.financial_entity_relations for delete to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

create policy "Admins can read query resolution events"
  on public.query_resolution_events for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins can update query resolution events"
  on public.query_resolution_events for update to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')))
  with check ((select public.has_role((select auth.uid()), 'admin')));
create policy "Admins can delete query resolution events"
  on public.query_resolution_events for delete to authenticated
  using ((select public.has_role((select auth.uid()), 'admin')));

revoke all on public.financial_entities from anon, authenticated;
revoke all on public.financial_entity_aliases from anon, authenticated;
revoke all on public.financial_entity_relations from anon, authenticated;
revoke all on public.query_resolution_events from anon, authenticated;
grant select on public.financial_entities, public.financial_entity_aliases, public.financial_entity_relations to anon, authenticated;
grant insert, update, delete on public.financial_entities, public.financial_entity_aliases to authenticated;
grant insert, delete on public.financial_entity_relations to authenticated;
grant select, update, delete on public.query_resolution_events to authenticated;

create or replace function public.normalize_financial_alias(value text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', ' ', 'g'));
$$;

revoke execute on function public.normalize_financial_alias(text) from public;
grant execute on function public.normalize_financial_alias(text) to anon, authenticated, service_role;

create or replace function public.sync_financial_entity_from_source()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  row_data jsonb;
  entity_kind text;
  entity_id text;
  label_value text;
  short_value text;
  key_value text;
  subtype_value text;
  manager_value text;
  market_value text;
  active_value boolean;
  brand_id text;
begin
  row_data := case when tg_op = 'delete' then to_jsonb(old) else to_jsonb(new) end;
  entity_kind := case tg_table_name
    when 'funds' then 'fund'
    when 'stocks' then 'stock'
    when 'exchange_rates' then 'fx'
    when 'commodities' then 'commodity'
  end;
  entity_id := entity_kind || ':' || (row_data->>'id');

  if tg_op = 'delete' then
    update public.financial_entities set is_active = false, updated_at = now() where id = entity_id;
    return old;
  end if;

  label_value := case tg_table_name
    when 'funds' then row_data->>'name'
    when 'stocks' then coalesce(row_data->>'name', row_data->>'symbol')
    when 'exchange_rates' then coalesce(row_data->>'currency_name', row_data->>'currency_code')
    when 'commodities' then coalesce(row_data->>'name', row_data->>'symbol')
  end;
  short_value := case tg_table_name
    when 'funds' then null
    when 'stocks' then row_data->>'symbol'
    when 'exchange_rates' then row_data->>'currency_code'
    when 'commodities' then row_data->>'symbol'
  end;
  key_value := case tg_table_name
    when 'funds' then row_data->>'slug'
    when 'stocks' then row_data->>'symbol'
    when 'exchange_rates' then row_data->>'currency_code'
    when 'commodities' then row_data->>'symbol'
  end;
  subtype_value := case when tg_table_name = 'funds' then coalesce(row_data->>'fund_type', 'money_market') else null end;
  manager_value := case when tg_table_name = 'funds' then row_data->>'manager' else null end;
  market_value := case when tg_table_name = 'stocks' then 'NSE' when tg_table_name = 'exchange_rates' then 'KES' else null end;
  active_value := case
    when tg_table_name = 'funds' then coalesce((row_data->>'is_published')::boolean, true)
    else coalesce((row_data->>'is_active')::boolean, true)
  end;

  insert into public.financial_entities (
    id, kind, subtype, display_label, short_label, source_table, source_id,
    source_key, manager, market, is_active, updated_at
  ) values (
    entity_id, entity_kind, subtype_value, label_value, short_value,
    tg_table_name, (row_data->>'id')::uuid, key_value, manager_value,
    market_value, active_value, now()
  )
  on conflict (id) do update set
    subtype = excluded.subtype,
    display_label = excluded.display_label,
    short_label = excluded.short_label,
    source_key = excluded.source_key,
    manager = excluded.manager,
    market = excluded.market,
    is_active = excluded.is_active,
    updated_at = now();

  insert into public.financial_entity_aliases (entity_id, alias, alias_normalized, origin, is_approved)
  select entity_id, value, public.normalize_financial_alias(value), 'catalog', true
  from unnest(array[label_value, short_value, key_value, manager_value]) value
  where value is not null and public.normalize_financial_alias(value) <> ''
  on conflict (entity_id, alias_normalized) do update set alias = excluded.alias, is_approved = true;

  if manager_value is not null and trim(manager_value) <> '' then
    brand_id := 'brand:' || md5(public.normalize_financial_alias(manager_value));
    insert into public.financial_entities (id, kind, subtype, display_label, source_key, is_active)
    values (brand_id, 'brand', 'fund_manager', manager_value, public.normalize_financial_alias(manager_value), true)
    on conflict (id) do update set display_label = excluded.display_label, is_active = true, updated_at = now();
    insert into public.financial_entity_aliases (entity_id, alias, alias_normalized, origin, is_approved)
    values (brand_id, manager_value, public.normalize_financial_alias(manager_value), 'catalog', true)
    on conflict (entity_id, alias_normalized) do update set alias = excluded.alias, is_approved = true;
    insert into public.financial_entity_relations (from_entity_id, to_entity_id, relation_type)
    values (brand_id, entity_id, 'manages')
    on conflict do nothing;
    insert into public.financial_entity_relations (from_entity_id, to_entity_id, relation_type)
    values (entity_id, brand_id, 'managed_by')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_financial_entity_from_source() from public;

create trigger sync_financial_entity_funds
after insert or update or delete on public.funds
for each row execute function public.sync_financial_entity_from_source();
create trigger sync_financial_entity_stocks
after insert or update or delete on public.stocks
for each row execute function public.sync_financial_entity_from_source();
create trigger sync_financial_entity_rates
after insert or update or delete on public.exchange_rates
for each row execute function public.sync_financial_entity_from_source();
create trigger sync_financial_entity_commodities
after insert or update or delete on public.commodities
for each row execute function public.sync_financial_entity_from_source();

-- Seed all existing source rows without mutating their timestamps.
insert into public.financial_entities (id, kind, subtype, display_label, source_table, source_id, source_key, manager, is_active)
select 'fund:' || id, 'fund', coalesce(fund_type, 'money_market'), name, 'funds', id, slug, manager, is_published from public.funds
on conflict (id) do nothing;
insert into public.financial_entities (id, kind, display_label, short_label, source_table, source_id, source_key, market, is_active)
select 'stock:' || id, 'stock', coalesce(name, symbol), symbol, 'stocks', id, symbol, 'NSE', is_active from public.stocks
on conflict (id) do nothing;
insert into public.financial_entities (id, kind, display_label, short_label, source_table, source_id, source_key, market, is_active)
select 'fx:' || id, 'fx', coalesce(currency_name, currency_code), currency_code, 'exchange_rates', id, currency_code, 'KES', is_active from public.exchange_rates
on conflict (id) do nothing;
insert into public.financial_entities (id, kind, display_label, short_label, source_table, source_id, source_key, is_active)
select 'commodity:' || id, 'commodity', coalesce(name, symbol), symbol, 'commodities', id, symbol, is_active from public.commodities
on conflict (id) do nothing;

insert into public.financial_entities (id, kind, subtype, display_label, source_key)
select 'brand:' || md5(public.normalize_financial_alias(manager)), 'brand', 'fund_manager', manager, public.normalize_financial_alias(manager)
from (select distinct manager from public.funds where manager is not null and trim(manager) <> '') managers
on conflict (id) do nothing;

insert into public.financial_entity_aliases (entity_id, alias, alias_normalized)
select id, alias, public.normalize_financial_alias(alias)
from public.financial_entities
cross join lateral unnest(array[display_label, short_label, source_key, manager]) alias
where alias is not null and public.normalize_financial_alias(alias) <> ''
on conflict (entity_id, alias_normalized) do nothing;

insert into public.financial_entity_relations (from_entity_id, to_entity_id, relation_type)
select 'brand:' || md5(public.normalize_financial_alias(manager)), id, 'manages'
from public.financial_entities where kind = 'fund' and manager is not null
on conflict do nothing;
insert into public.financial_entity_relations (from_entity_id, to_entity_id, relation_type)
select id, 'brand:' || md5(public.normalize_financial_alias(manager)), 'managed_by'
from public.financial_entities where kind = 'fund' and manager is not null
on conflict do nothing;

insert into public.financial_entities (id, kind, subtype, display_label, source_key, metadata) values
  ('calculator:investment', 'calculator', 'investment', 'Investment calculator', 'investment', '{"path":"/calculator"}'),
  ('calculator:currency', 'calculator', 'currency', 'Currency converter', 'currency', '{"path":"/calculator"}'),
  ('calculator:paye', 'calculator', 'tax', 'PAYE calculator', 'paye', '{"path":"/calculator"}'),
  ('portfolio:holdings', 'portfolio', 'holdings', 'Portfolio holdings', 'portfolio', '{"path":"/portfolio"}'),
  ('portfolio:watchlist', 'portfolio', 'watchlist', 'Watchlist', 'watchlist', '{"path":"/watchlist"}'),
  ('news:markets', 'news_topic', 'market_news', 'Market news', 'market-news', '{"path":"/news"}'),
  ('topic:money-market-funds', 'market_topic', 'education', 'Money market funds', 'money-market-funds', '{}'),
  ('topic:stocks', 'market_topic', 'education', 'NSE stocks', 'stocks', '{}'),
  ('topic:fx', 'market_topic', 'education', 'Foreign exchange', 'fx', '{}'),
  ('topic:commodities', 'market_topic', 'education', 'Commodities', 'commodities', '{}')
on conflict (id) do update set display_label = excluded.display_label, metadata = excluded.metadata, updated_at = now();

insert into public.financial_entity_aliases (entity_id, alias, alias_normalized) values
  ('calculator:investment', 'compound interest', 'compound interest'),
  ('calculator:currency', 'FX calculator', 'fx calculator'),
  ('calculator:paye', 'salary tax', 'salary tax'),
  ('portfolio:holdings', 'my investments', 'my investments'),
  ('portfolio:watchlist', 'favourites', 'favourites'),
  ('news:markets', 'headlines', 'headlines'),
  ('topic:money-market-funds', 'MMF', 'mmf'),
  ('topic:money-market-funds', 'money market', 'money market'),
  ('topic:stocks', 'shares', 'shares'),
  ('topic:fx', 'forex', 'forex'),
  ('topic:commodities', 'commodity prices', 'commodity prices')
on conflict (entity_id, alias_normalized) do nothing;

create view public.financial_entity_catalog
with (security_invoker = true)
as
select
  entity.id,
  entity.kind,
  entity.subtype,
  entity.display_label,
  entity.short_label,
  entity.source_table,
  entity.source_id,
  entity.source_key,
  entity.manager,
  entity.market,
  entity.metadata,
  coalesce(array_agg(alias.alias order by alias.alias) filter (where alias.is_approved), '{}') as aliases
from public.financial_entities entity
left join public.financial_entity_aliases alias on alias.entity_id = entity.id and alias.is_approved
where entity.is_active
group by entity.id;

revoke all on public.financial_entity_catalog from anon, authenticated;
grant select on public.financial_entity_catalog to anon, authenticated;
