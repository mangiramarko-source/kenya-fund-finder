-- Run after all migrations. Fixtures and mutations are transaction-local; no
-- Edge Function, cron endpoint, or email provider is invoked.
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);
set local lock_timeout = '3s';
set local statement_timeout = '15s';

select set_config('kff.owner', gen_random_uuid()::text, true);
select set_config('kff.other', gen_random_uuid()::text, true);
insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  (current_setting('kff.owner')::uuid, 'automation-owner@example.invalid', 'authenticated', 'authenticated', '{}'::jsonb),
  (current_setting('kff.other')::uuid, 'automation-other@example.invalid', 'authenticated', 'authenticated', '{}'::jsonb);

-- A legacy default-on price flag is ineffective without explicit consent.
update public.communication_preferences
set price_alert_email = true, price_alert_email_consented_at = null
where user_id = current_setting('kff.owner')::uuid;

insert into public.communication_suppressions (email_normalized, scope, reason, source)
values
  ('automation-owner@example.invalid', 'price_alert', 'unsubscribe', 'one_click'),
  ('automation-owner@example.invalid', 'all_email', 'hard_bounce', 'resend_webhook');

set local role service_role;
select public.update_communication_preferences_service(
  current_setting('kff.owner')::uuid,
  'automation-owner@example.invalid',
  true,
  true,
  true
);
reset role;

do $$
begin
  if not exists (
    select 1 from public.communication_preferences
    where user_id = current_setting('kff.owner')::uuid
      and market_brief_email and market_brief_email_consented_at is not null
      and price_alert_email and price_alert_email_consented_at is not null
      and email_welcome_completed
  ) then raise exception 'Explicit consent was not recorded'; end if;
  if exists (
    select 1 from public.communication_suppressions
    where email_normalized = 'automation-owner@example.invalid'
      and scope = 'price_alert' and reason = 'unsubscribe' and lifted_at is null
  ) then raise exception 'User-owned unsubscribe suppression was not lifted'; end if;
  if not exists (
    select 1 from public.communication_suppressions
    where email_normalized = 'automation-owner@example.invalid'
      and scope = 'all_email' and reason = 'hard_bounce' and lifted_at is null
  ) then raise exception 'Protected hard-bounce suppression was lifted'; end if;
  if has_column_privilege('authenticated', 'public.communication_preferences', 'price_alert_email', 'UPDATE')
     or has_column_privilege('authenticated', 'public.communication_preferences', 'market_brief_email', 'UPDATE') then
    raise exception 'Authenticated role can bypass consent endpoint';
  end if;
end $$;

insert into public.communication_outbox (user_id, category, idempotency_key, payload)
values
  (current_setting('kff.owner')::uuid, 'news_highlights', 'safe-test-owner', '{"edition_id":"test"}'::jsonb),
  (current_setting('kff.other')::uuid, 'news_highlights', 'safe-test-other', '{"edition_id":"test"}'::jsonb);

set local role service_role;
select count(*) from public.claim_communication_category_batch(
  'news_highlights', 5, 300, array[current_setting('kff.owner')::uuid]
);
reset role;

do $$
declare
  owned_token uuid;
  affected integer;
begin
  select claim_token into owned_token from public.communication_outbox where idempotency_key = 'safe-test-owner';
  if owned_token is null then raise exception 'Claim token was not assigned'; end if;
  if not exists (select 1 from public.communication_outbox where idempotency_key = 'safe-test-owner' and status = 'processing')
     or not exists (select 1 from public.communication_outbox where idempotency_key = 'safe-test-other' and status = 'pending') then
    raise exception 'Allowlisted claim touched the wrong cohort';
  end if;
  update public.communication_outbox set status = 'failed'
  where idempotency_key = 'safe-test-owner' and claim_token = gen_random_uuid();
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Stale claim token changed queue state'; end if;
end $$;

update public.communication_outbox
set status = 'accepted', delivery_status = 'accepted', provider_message_id = 'provider-safe-test',
    recipient_email = 'automation-owner@example.invalid', claim_token = null, lease_expires_at = null
where idempotency_key = 'safe-test-owner';

set local role service_role;
select * from public.record_communication_delivery_event(
  'event-delivered', 'provider-safe-test', 'email.delivered', '2026-08-26T20:00:00Z', null
);
select * from public.record_communication_delivery_event(
  'event-delivered', 'provider-safe-test', 'email.delivered', '2026-08-26T20:00:00Z', null
);
select * from public.record_communication_delivery_event(
  'event-complaint', 'provider-safe-test', 'email.complained', '2026-08-26T19:59:00Z', 'complaint'
);
reset role;

do $$
begin
  if (select count(*) from public.communication_delivery_events where provider_message_id = 'provider-safe-test') <> 2 then
    raise exception 'Webhook event deduplication failed';
  end if;
  if (select delivery_status from public.communication_outbox where idempotency_key = 'safe-test-owner') <> 'complained' then
    raise exception 'Higher-priority terminal delivery state did not win';
  end if;
  if exists (
    select 1 from cron.job where jobname in (
      'news-highlights-weekdays', 'market-overview-weekdays', 'market-brief-weekdays',
      'process-news-highlights', 'process-market-brief'
    )
  ) then raise exception 'Automation schedules were installed before pilot approval'; end if;
end $$;

select pass('consent, suppression lifecycle, cohort claims, fencing, webhook ordering, and schedules-off safety are enforced');
select * from finish();
rollback;
