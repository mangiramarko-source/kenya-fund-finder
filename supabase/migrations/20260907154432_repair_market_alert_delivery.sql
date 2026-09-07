-- Repair production alert writes and restore the evaluator/delivery jobs.
-- The client uses asset_unit; older production rows used price_unit. Keep the
-- legacy column for safe backwards compatibility, while making asset_unit the
-- canonical field used by the current app and notification payloads.
alter table public.price_alerts
  add column if not exists asset_unit text;

update public.price_alerts
set asset_unit = coalesce(nullif(btrim(price_unit), ''), 'KES')
where asset_unit is null or btrim(asset_unit) = '';

alter table public.price_alerts
  alter column asset_unit set default 'KES',
  alter column asset_unit set not null;

grant insert (asset_unit) on public.price_alerts to authenticated;
grant update (asset_unit) on public.price_alerts to authenticated;

-- stock_id is an evaluator-owned compatibility field. The browser supplies
-- only the public asset identity; this trigger validates it and fills stock_id
-- for stock alerts.
revoke insert (stock_id), update (stock_id) on public.price_alerts from authenticated;

create or replace function private.validate_price_alert_asset()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.asset_unit is null or btrim(new.asset_unit) = '' then
    raise exception 'asset_unit is required';
  end if;

  case new.asset_type
    when 'stock' then
      if not exists (select 1 from public.stocks where id = new.asset_id and is_active) then
        raise exception 'stock alert asset must reference an active stock';
      end if;
      new.stock_id := new.asset_id;
    when 'fund' then
      if not exists (select 1 from public.funds where id = new.asset_id and is_published) then
        raise exception 'fund alert asset must reference a published fund';
      end if;
      new.stock_id := null;
    when 'currency' then
      if not exists (select 1 from public.exchange_rates where id = new.asset_id and is_active) then
        raise exception 'currency alert asset must reference an active exchange rate';
      end if;
      new.stock_id := null;
    when 'commodity' then
      if not exists (select 1 from public.commodities where id = new.asset_id and is_active) then
        raise exception 'commodity alert asset must reference an active commodity';
      end if;
      new.stock_id := null;
    else
      raise exception 'unsupported alert asset type';
  end case;

  return new;
end;
$$;

revoke all on function private.validate_price_alert_asset() from public, anon, authenticated;

drop trigger if exists validate_price_alert_asset_before_write on public.price_alerts;
create trigger validate_price_alert_asset_before_write
before insert or update of asset_type, asset_id, asset_unit on public.price_alerts
for each row execute function private.validate_price_alert_asset();

create or replace function public.claim_price_alert_event(
  p_alert_id uuid,
  p_triggered_price numeric,
  p_source_observed_at timestamptz default now(),
  p_email_allowed boolean default false
)
returns table (alert_id uuid, user_id uuid, trigger_count integer, notification_created boolean, outbox_created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed public.price_alerts%rowtype;
  v_event_key text;
  v_current text;
  v_target text;
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
  v_current := trim(to_char(p_triggered_price, 'FM999999999990D00')) || case when claimed.asset_unit = '%' then '%' else ' ' || claimed.asset_unit end;
  v_target := trim(to_char(claimed.target_price, 'FM999999999990D00')) || case when claimed.asset_unit = '%' then '%' else ' ' || claimed.asset_unit end;

  if claimed.notify_inapp and coalesce((
    select cp.price_alert_inapp from public.communication_preferences cp where cp.user_id = claimed.user_id
  ), true) then
    insert into public.notifications (user_id, event_key, title, message, type, metadata)
    values (
      claimed.user_id,
      v_event_key,
      format('Market alert: %s', claimed.asset_name),
      format('%s is now %s, meeting your %s %s alert. Data update only — not financial advice.', claimed.asset_name, v_current, claimed.condition, v_target),
      'price_alert',
      jsonb_build_object(
        'alert_id', claimed.id, 'asset_type', claimed.asset_type, 'asset_id', claimed.asset_id,
        'asset_name', claimed.asset_name, 'asset_unit', claimed.asset_unit, 'condition', claimed.condition,
        'target_price', claimed.target_price, 'triggered_price', p_triggered_price,
        'trigger_count', claimed.trigger_count, 'observed_at', p_source_observed_at
      )
    ) on conflict (event_key) where event_key is not null do nothing;
    create_notification := found;
  end if;

  -- Email is created only when the alert itself is opted in, the account has
  -- explicitly consented, and the evaluator has confirmed no suppression.
  if p_email_allowed and claimed.notify_email and exists (
    select 1 from public.communication_preferences cp
    where cp.user_id = claimed.user_id
      and cp.price_alert_email
      and cp.price_alert_email_consented_at is not null
  ) then
    insert into public.communication_outbox (user_id, category, idempotency_key, payload)
    values (
      claimed.user_id, 'price_alert', v_event_key,
      jsonb_build_object(
        'alert_id', claimed.id, 'asset_type', claimed.asset_type, 'asset_id', claimed.asset_id,
        'asset_name', claimed.asset_name, 'asset_unit', claimed.asset_unit, 'condition', claimed.condition,
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

-- Run the evaluator after hourly market refreshes and process only price-alert
-- emails. The named vault secret remains in the database; no credentials reach
-- the browser or migration source.
do $$
begin
  begin perform cron.unschedule('check-market-alerts-hourly'); exception when others then null; end;
  begin perform cron.unschedule('process-market-alert-delivery'); exception when others then null; end;
end $$;

select cron.schedule(
  'check-market-alerts-hourly', '2 6-14 * * 1-5',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/check-price-alerts',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')),
      body := '{}'::jsonb
    );
  $job$
);

select cron.schedule(
  'process-market-alert-delivery', '* * * * *',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/process-communication-outbox',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')),
      body := '{"category":"price_alert","batch_size":5}'::jsonb
    );
  $job$
);
