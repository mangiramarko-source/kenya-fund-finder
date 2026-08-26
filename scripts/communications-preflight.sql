-- READ-ONLY readiness snapshot. Run with an authorized database connection.
-- No Edge Function invocation, queue claim, secret value, recipient address,
-- schedule change, consent update, or email submission is performed.
-- This report is evidence for review, NOT permission to activate sending.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '15s';

with clock as (
  select now() as checked_at, (now() at time zone 'Africa/Nairobi')::date as nairobi_date
), jobs as (
  select jobname, schedule, active,
    coalesce(jobname ~* '(communication|market.brief|news.highlights|price.alert|email|market.overview)', false)
      or command ~* '(process-communication-outbox|run-news-highlights-edition|enqueue-market-brief|check-price-alerts|generate-market-overview|process-email-queue|send-market-update|send-market-brief-demo)'
      as communication_related
  from cron.job
), queue as (
  select category, status, delivery_status, count(*) as rows,
    min(created_at) as oldest_created_at, max(delivered_at) as latest_delivered_at
  from public.communication_outbox group by category, status, delivery_status
), defaults as (
  select column_name, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'communication_preferences'
    and column_name in ('price_alert_email', 'market_brief_email', 'email_welcome_completed')
), latest_overview as (
  select market_date, status, generated_at, source_as_of, blocked_reasons
  from public.market_overviews order by market_date desc limit 1
), latest_edition as (
  select edition_date, status, generated_at,
    jsonb_array_length(selected_articles) as selected_article_count
  from public.news_highlights_editions order by edition_date desc limit 1
), active_alerts as (
  select asset_type, condition, count(*) as rows
  from public.price_alerts where is_active and not is_triggered
  group by asset_type, condition
)
select jsonb_build_object(
  'report_version', 2,
  'checked_at', clock.checked_at,
  'nairobi_date', clock.nairobi_date,
  'launch_authorized_by_report', false,
  'jobs', coalesce((select jsonb_agg(to_jsonb(jobs) order by jobname) from jobs), '[]'::jsonb),
  'active_communication_jobs', (select count(*) from jobs where active and communication_related),
  'outbox', coalesce((select jsonb_agg(to_jsonb(queue) order by category, status, delivery_status) from queue), '[]'::jsonb),
  'nonterminal_rows', (select count(*) from public.communication_outbox where status in ('pending','processing','retry_wait','submission_unknown')),
  'submission_unknown_rows', (select count(*) from public.communication_outbox where status = 'submission_unknown'),
  'expired_processing_leases', (select count(*) from public.communication_outbox where status = 'processing' and lease_expires_at < clock.checked_at),
  'exhausted_processing_rows', (select count(*) from public.communication_outbox where status = 'processing' and attempts >= 3),
  'accepted_without_delivery_after_one_hour', (select count(*) from public.communication_outbox where status = 'accepted' and delivery_status = 'accepted' and sent_at < clock.checked_at - interval '1 hour'),
  'duplicate_provider_id_groups', (select count(*) from (select provider_message_id from public.communication_outbox where provider_message_id is not null group by provider_message_id having count(*) > 1) duplicate_ids),
  'consent', (select jsonb_build_object(
    'accounts', count(*),
    'brief_confirmed', count(*) filter (where market_brief_email and market_brief_email_consented_at is not null),
    'brief_unconfirmed', count(*) filter (where market_brief_email and market_brief_email_consented_at is null),
    'price_email_confirmed', count(*) filter (where price_alert_email and price_alert_email_consented_at is not null),
    'price_email_legacy_unconfirmed', count(*) filter (where price_alert_email and price_alert_email_consented_at is null),
    'welcome_incomplete', count(*) filter (where not email_welcome_completed)
  ) from public.communication_preferences),
  'accounts_missing_preferences', (select count(*) from auth.users u left join public.communication_preferences p on p.user_id = u.id where p.user_id is null),
  'preference_defaults', coalesce((select jsonb_object_agg(column_name, column_default) from defaults), '{}'::jsonb),
  'new_account_defaults_off', (select count(*) = 3 and bool_and(column_default = 'false') from defaults),
  'active_alerts', coalesce((select jsonb_agg(to_jsonb(active_alerts) order by asset_type, condition) from active_alerts), '[]'::jsonb),
  'active_suppressions', (select count(*) from public.communication_suppressions where lifted_at is null),
  'delivery_event_count', (select count(*) from public.communication_delivery_events),
  'latest_overview', (select to_jsonb(latest_overview) from latest_overview),
  'ready_overview_for_today', exists(select 1 from public.market_overviews where market_date = clock.nairobi_date and status = 'ready'),
  'latest_news_edition', (select to_jsonb(latest_edition) from latest_edition),
  'ready_news_edition_for_today', exists(select 1 from public.news_highlights_editions where edition_date = clock.nairobi_date and status = 'ready'),
  'stocks_freshness_only', (select jsonb_build_object(
    'active', count(*), 'updated_today', count(*) filter (where (updated_at at time zone 'Africa/Nairobi')::date = clock.nairobi_date),
    'latest_update', max(updated_at)
  ) from public.stocks where is_active),
  'usd_kes_freshness_only', (select jsonb_build_object(
    'updated_at', updated_at, 'age_minutes', round(extract(epoch from (clock.checked_at - updated_at)) / 60, 1)
  ) from public.exchange_rates where currency_code = 'USD' and is_active limit 1),
  'required_vault_name_presence', (select jsonb_build_object(
    'project_url', count(*) filter (where name = 'kff_project_url') = 1,
    'automations_caller_key', count(*) filter (where name = 'kff_automations_secret_key') = 1
  ) from vault.secrets),
  'manual_gates_not_proven_by_sql', jsonb_build_array(
    'Exact Edge Function source and deployed dependency parity',
    'Runtime send mode, approved allowlist and provider configuration',
    'Runtime verification that consent/suppression checks fail closed',
    'Runtime verification that internal mode mutates only the approved cohort/category',
    'Frozen retry payload and claim-fencing evidence under concurrent workers',
    'Price-alert coverage matches every enabled UI asset/condition',
    'Same-date quality gates; source freshness alone is not validated coverage',
    'Signed webhook ordering, failures, unsubscribe and deliberate re-subscribe',
    'Controlled live pilot and explicit schedule activation approval'
  )
) as communications_preflight
from clock;

rollback;
