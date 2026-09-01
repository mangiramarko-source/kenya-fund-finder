-- Desktop Watchlist Workspace: all supported market assets can be monitored.
-- Client-side users retain ownership of configuration only; service-controlled
-- evaluation state remains writable exclusively by the evaluator.

alter table public.price_alerts
  add column if not exists asset_unit text not null default 'KES';

update public.price_alerts
set asset_unit = 'KES'
where coalesce(asset_unit, '') = '';

alter table public.price_alerts
  drop constraint if exists price_alerts_stock_only_mvp,
  drop constraint if exists price_alerts_active_requires_stock,
  drop constraint if exists price_alerts_asset_type_check;

alter table public.price_alerts
  add constraint price_alerts_asset_type_check
  check (asset_type in ('stock', 'fund', 'currency', 'commodity')) not valid;

grant insert (asset_unit) on public.price_alerts to authenticated;
grant update (asset_unit) on public.price_alerts to authenticated;
revoke insert (stock_id), update (stock_id) on public.price_alerts from authenticated;

create or replace function private.validate_price_alert_asset()
returns trigger
language plpgsql
security definer
set search_path = public
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
  p_email_allowed boolean default true
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

  if claimed.notify_inapp and coalesce((select cp.price_alert_inapp from public.communication_preferences cp where cp.user_id = claimed.user_id), true) then
    insert into public.notifications (user_id, event_key, title, message, type, metadata)
    values (
      claimed.user_id, v_event_key, format('Market alert: %s', claimed.asset_name),
      format('%s is now %s, meeting your %s %s alert. Data update only — not financial advice.', claimed.asset_name, v_current, claimed.condition, v_target),
      'price_alert',
      jsonb_build_object('alert_id', claimed.id, 'asset_type', claimed.asset_type, 'asset_id', claimed.asset_id, 'asset_unit', claimed.asset_unit, 'condition', claimed.condition, 'target_price', claimed.target_price, 'triggered_price', p_triggered_price, 'trigger_count', claimed.trigger_count, 'observed_at', p_source_observed_at)
    ) on conflict (event_key) where event_key is not null do nothing;
    create_notification := found;
  end if;

  if p_email_allowed and claimed.notify_email and coalesce((select cp.price_alert_email from public.communication_preferences cp where cp.user_id = claimed.user_id), true) then
    insert into public.communication_outbox (user_id, category, idempotency_key, payload)
    values (
      claimed.user_id, 'price_alert', v_event_key,
      jsonb_build_object('alert_id', claimed.id, 'asset_type', claimed.asset_type, 'asset_id', claimed.asset_id, 'asset_name', claimed.asset_name, 'asset_unit', claimed.asset_unit, 'condition', claimed.condition, 'target_price', claimed.target_price, 'triggered_price', p_triggered_price, 'trigger_count', claimed.trigger_count, 'observed_at', p_source_observed_at)
    ) on conflict (idempotency_key) do nothing;
    create_outbox := found;
  end if;

  return query select claimed.id, claimed.user_id, claimed.trigger_count, create_notification, create_outbox;
end;
$$;

-- Cron calls use the existing Vault-held named automation key. Do not embed
-- project credentials in migration history or cron.job.command.
do $$
begin
  begin perform cron.unschedule('check-market-alerts-hourly'); exception when others then null; end;
  begin perform cron.unschedule('process-market-alert-delivery'); exception when others then null; end;
end $$;

select cron.schedule(
  'check-market-alerts-hourly', '10 * * * 1-5',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/check-price-alerts',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')),
      body := '{}'::jsonb
    );
  $job$
);

select cron.schedule(
  'process-market-alert-delivery', '15 * * * 1-5',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/process-communication-outbox',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')),
      body := '{"batch_size":25}'::jsonb
    );
  $job$
);
