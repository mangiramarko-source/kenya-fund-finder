-- Safe email automation foundation. This migration deliberately creates no
-- pg_cron jobs and sends no email.

-- Explicit consent evidence. Market Brief was historically default-off, so an
-- existing enabled value is an affirmative choice and may be backfilled.
-- Price email was historically default-on, so legacy true values remain
-- unconfirmed until the user deliberately enables them again.
alter table public.communication_preferences
  add column market_brief_email_consented_at timestamptz,
  add column price_alert_email_consented_at timestamptz;

update public.communication_preferences
set market_brief_email_consented_at = coalesce(updated_at, created_at, now())
where market_brief_email
  and market_brief_email_consented_at is null;

-- Email choices now pass through the authenticated preference endpoint, which
-- records consent and handles user-owned unsubscribe suppressions atomically.
revoke update (market_brief_email, price_alert_email, email_welcome_completed)
  on public.communication_preferences from authenticated;

-- Durable claim ownership and a frozen provider request prevent late workers
-- or changed live data from altering a retry under the same idempotency key.
alter table public.communication_outbox
  add column claim_token uuid,
  add column provider_request jsonb
    check (provider_request is null or jsonb_typeof(provider_request) = 'object'),
  add column provider_request_frozen_at timestamptz,
  add column submission_started_at timestamptz,
  add column delivery_event_at timestamptz;

alter table public.communication_outbox
  drop constraint communication_outbox_status_check,
  add constraint communication_outbox_status_check
    check (status in (
      'pending', 'processing', 'retry_wait', 'accepted',
      'submission_unknown', 'cancelled', 'failed'
    )),
  drop constraint communication_outbox_delivery_status_check,
  add constraint communication_outbox_delivery_status_check
    check (delivery_status in (
      'not_sent', 'accepted', 'sent', 'delayed', 'delivered',
      'failed', 'bounced', 'complained', 'suppressed'
    ));

alter table public.communication_suppressions
  drop constraint communication_suppressions_reason_check,
  add constraint communication_suppressions_reason_check
    check (reason in ('unsubscribe', 'hard_bounce', 'complaint', 'provider_suppression', 'admin'));

create table public.communication_delivery_events (
  id uuid primary key default gen_random_uuid(),
  webhook_event_id text not null unique check (length(webhook_event_id) between 1 and 256),
  provider_message_id text not null check (length(provider_message_id) between 1 and 256),
  event_type text not null check (event_type in (
    'email.sent', 'email.delivered', 'email.delivery_delayed',
    'email.failed', 'email.bounced', 'email.complained', 'email.suppressed'
  )),
  event_created_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index communication_delivery_events_provider_idx
  on public.communication_delivery_events (provider_message_id, event_created_at desc);

alter table public.communication_delivery_events enable row level security;
revoke all on public.communication_delivery_events from public, anon, authenticated;
grant all on public.communication_delivery_events to service_role;

-- Category is mandatory. Internal-mode callers pass the resolved allowlisted
-- user ids, which prevents unrelated rows from being claimed or cancelled.
create or replace function public.claim_communication_category_batch(
  p_category text,
  p_limit integer,
  p_lease_seconds integer,
  p_allowed_user_ids uuid[] default null
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
  if p_limit < 1 or p_limit > 5 then
    raise exception 'p_limit must be between 1 and 5';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 300 then
    raise exception 'p_lease_seconds must be between 60 and 300';
  end if;

  return query
  with claimable as (
    select co.id
    from public.communication_outbox co
    where co.category = p_category
      and co.attempts < 3
      and (p_allowed_user_ids is null or co.user_id = any(p_allowed_user_ids))
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
      claim_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      failure_reason = null,
      updated_at = now()
  from claimable
  where co.id = claimable.id
  returning co.*;
end;
$$;

revoke all on function public.claim_communication_category_batch(text, integer, integer, uuid[])
  from public, anon, authenticated;
grant execute on function public.claim_communication_category_batch(text, integer, integer, uuid[])
  to service_role;

-- Service-only transactional preference update. The Edge Function supplies the
-- verified auth user id/email; this function changes only that row and lifts
-- only one-click unsubscribe suppressions for channels explicitly re-enabled.
create or replace function public.update_communication_preferences_service(
  p_user_id uuid,
  p_email_normalized text,
  p_market_brief_email boolean default null,
  p_price_alert_email boolean default null,
  p_email_welcome_completed boolean default null
)
returns public.communication_preferences
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.communication_preferences%rowtype;
begin
  if p_email_normalized <> lower(btrim(p_email_normalized)) or p_email_normalized = '' then
    raise exception 'Invalid normalized email';
  end if;
  if p_market_brief_email is null and p_price_alert_email is null and p_email_welcome_completed is null then
    raise exception 'At least one preference value is required';
  end if;

  update public.communication_preferences cp
  set market_brief_email = coalesce(p_market_brief_email, cp.market_brief_email),
      market_brief_email_consented_at = case
        when p_market_brief_email is true then now()
        when p_market_brief_email is false then null
        else cp.market_brief_email_consented_at end,
      price_alert_email = coalesce(p_price_alert_email, cp.price_alert_email),
      price_alert_email_consented_at = case
        when p_price_alert_email is true then now()
        when p_price_alert_email is false then null
        else cp.price_alert_email_consented_at end,
      email_welcome_completed = coalesce(p_email_welcome_completed, cp.email_welcome_completed),
      updated_at = now()
  where cp.user_id = p_user_id
  returning cp.* into saved;
  if saved.user_id is null then raise exception 'Preference row not found'; end if;

  if p_market_brief_email is true then
    update public.communication_suppressions
    set lifted_at = now()
    where email_normalized = p_email_normalized
      and scope = 'market_brief'
      and reason = 'unsubscribe'
      and source = 'one_click'
      and lifted_at is null;
  end if;
  if p_price_alert_email is true then
    update public.communication_suppressions
    set lifted_at = now()
    where email_normalized = p_email_normalized
      and scope = 'price_alert'
      and reason = 'unsubscribe'
      and source = 'one_click'
      and lifted_at is null;
  end if;

  return saved;
end;
$$;

revoke all on function public.update_communication_preferences_service(uuid, text, boolean, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.update_communication_preferences_service(uuid, text, boolean, boolean, boolean)
  to service_role;

-- Legacy price-email flags are not sufficient: both the boolean and explicit
-- consent timestamp must be present before an email event can enter the outbox.
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

  if claimed.id is null then return; end if;

  select s.name into stock_name from public.stocks s where s.id = claimed.stock_id;
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

  if p_email_allowed and claimed.notify_email and exists (
    select 1
    from public.communication_preferences cp
    where cp.user_id = claimed.user_id
      and cp.price_alert_email
      and cp.price_alert_email_consented_at is not null
  ) then
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

-- Store each provider event once and advance delivery state monotonically.
create or replace function public.record_communication_delivery_event(
  p_webhook_event_id text,
  p_provider_message_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_failure_reason text default null
)
returns table (
  event_inserted boolean,
  outbox_updated boolean,
  recipient_email text,
  delivery_status text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_inserted boolean := false;
  v_updated boolean := false;
  v_recipient text;
begin
  v_status := case p_event_type
    when 'email.sent' then 'sent'
    when 'email.delivered' then 'delivered'
    when 'email.delivery_delayed' then 'delayed'
    when 'email.failed' then 'failed'
    when 'email.bounced' then 'bounced'
    when 'email.complained' then 'complained'
    when 'email.suppressed' then 'suppressed'
    else null
  end;
  if v_status is null then raise exception 'Unsupported delivery event'; end if;

  insert into public.communication_delivery_events (
    webhook_event_id, provider_message_id, event_type, event_created_at
  ) values (
    p_webhook_event_id, p_provider_message_id, p_event_type, p_event_created_at
  ) on conflict (webhook_event_id) do nothing;
  v_inserted := found;

  if v_inserted then
    update public.communication_outbox co
    set delivery_status = v_status,
        delivery_event_at = p_event_created_at,
        delivered_at = case when v_status = 'delivered' then p_event_created_at else co.delivered_at end,
        failure_reason = case
          when v_status in ('failed', 'bounced', 'complained', 'suppressed')
            then left(coalesce(p_failure_reason, p_event_type), 1000)
          when v_status = 'delivered' then null
          else co.failure_reason
        end,
        updated_at = now()
    where co.provider_message_id = p_provider_message_id
      and (
        co.delivery_event_at is null
        or p_event_created_at >= co.delivery_event_at
        or case v_status
          when 'complained' then 100 when 'suppressed' then 95
          when 'bounced' then 90 when 'failed' then 80
          when 'delivered' then 70 when 'delayed' then 50
          when 'sent' then 40 else 0 end
        > case co.delivery_status
          when 'complained' then 100 when 'suppressed' then 95
          when 'bounced' then 90 when 'failed' then 80
          when 'delivered' then 70 when 'delayed' then 50
          when 'sent' then 40 when 'accepted' then 30 else 0 end
      )
    returning co.recipient_email into v_recipient;
    v_updated := found;
  else
    select co.recipient_email, co.delivery_status
      into v_recipient, v_status
    from public.communication_outbox co
    where co.provider_message_id = p_provider_message_id
    limit 1;
  end if;

  return query select v_inserted, v_updated, v_recipient, v_status;
end;
$$;

revoke all on function public.record_communication_delivery_event(text, text, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.record_communication_delivery_event(text, text, text, timestamptz, text)
  to service_role;

comment on table public.communication_delivery_events is
  'Deduplicated Resend delivery events used to advance outbox state monotonically.';
