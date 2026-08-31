-- Enable the existing alert flow for assets whose current prices are stored in
-- exchange_rates and commodities. Funds remain intentionally unsupported.
alter table public.price_alerts
  add column if not exists price_unit text not null default 'KES';

alter table public.price_alerts
  drop constraint if exists price_alerts_asset_type_check,
  drop constraint if exists price_alerts_check,
  drop constraint if exists price_alerts_stock_only_mvp,
  drop constraint if exists price_alerts_active_requires_stock;

drop index if exists public.price_alerts_active_unique_idx;
create unique index price_alerts_active_unique_idx
  on public.price_alerts (user_id, asset_type, asset_id, condition, target_price)
  where is_active and triggered_at is null;

drop index if exists public.price_alerts_evaluator_idx;
create index price_alerts_evaluator_idx
  on public.price_alerts (is_active, triggered_at, asset_type, asset_id)
  where is_active and triggered_at is null;

-- Explicit Data API privileges are used for this RLS-protected table.
grant insert (
  user_id, stock_id, asset_type, asset_id, asset_name, condition, target_price,
  price_unit, notify_email, notify_inapp, is_active, baseline_price
) on public.price_alerts to authenticated;
grant update (
  stock_id, asset_type, asset_id, asset_name, condition, target_price, price_unit,
  notify_email, notify_inapp, is_active, baseline_price, updated_at
) on public.price_alerts to authenticated;

create or replace function public.claim_price_alert_event(
  p_alert_id uuid,
  p_triggered_price numeric,
  p_source_observed_at timestamptz default now(),
  p_email_allowed boolean default false
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
    and ((pa.condition = 'above' and p_triggered_price >= pa.target_price)
      or (pa.condition = 'below' and p_triggered_price <= pa.target_price))
  returning pa.* into claimed;

  if claimed.id is null then return; end if;
  v_event_key := format('price_alert:%s:trigger:%s', claimed.id, claimed.trigger_count);

  if claimed.notify_inapp and coalesce((
    select cp.price_alert_inapp from public.communication_preferences cp where cp.user_id = claimed.user_id
  ), true) then
    insert into public.notifications (user_id, event_key, title, message, type, metadata)
    values (
      claimed.user_id,
      v_event_key,
      format('Price alert: %s', claimed.asset_name),
      format(
        '%s is now %s %s, meeting your %s %s %s alert. Data update only — not financial advice.',
        claimed.asset_name, claimed.price_unit, trim(to_char(p_triggered_price, 'FM999999999990D00')),
        claimed.condition, claimed.price_unit, trim(to_char(claimed.target_price, 'FM999999999990D00'))
      ),
      'price_alert',
      jsonb_build_object(
        'alert_id', claimed.id, 'asset_type', claimed.asset_type, 'asset_id', claimed.asset_id,
        'asset_name', claimed.asset_name, 'price_unit', claimed.price_unit, 'condition', claimed.condition,
        'target_price', claimed.target_price, 'triggered_price', p_triggered_price,
        'trigger_count', claimed.trigger_count, 'observed_at', p_source_observed_at
      )
    ) on conflict (event_key) where event_key is not null do nothing;
    create_notification := found;
  end if;

  if p_email_allowed and claimed.notify_email and exists (
    select 1 from public.communication_preferences cp
    where cp.user_id = claimed.user_id and cp.price_alert_email and cp.price_alert_email_consented_at is not null
  ) then
    insert into public.communication_outbox (user_id, category, idempotency_key, payload)
    values (
      claimed.user_id, 'price_alert', v_event_key,
      jsonb_build_object(
        'alert_id', claimed.id, 'asset_type', claimed.asset_type, 'asset_id', claimed.asset_id,
        'asset_name', claimed.asset_name, 'price_unit', claimed.price_unit, 'condition', claimed.condition,
        'target_price', claimed.target_price, 'triggered_price', p_triggered_price,
        'trigger_count', claimed.trigger_count, 'observed_at', p_source_observed_at
      )
    ) on conflict (idempotency_key) do nothing;
    create_outbox := found;
  end if;

  return query select claimed.id, claimed.user_id, claimed.trigger_count, create_notification, create_outbox;
end;
$$;

revoke all on function public.claim_price_alert_event(uuid, numeric, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.claim_price_alert_event(uuid, numeric, timestamptz, boolean)
  to service_role;
