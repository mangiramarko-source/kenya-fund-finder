-- Run after the migration. Fixtures and all updates are rolled back; no Auth API
-- or email endpoint is invoked. Only generated, transaction-local users are used.
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);
set local lock_timeout = '3s';
set local statement_timeout = '15s';
select set_config('kff.test_owner', gen_random_uuid()::text, true);
select set_config('kff.test_other', gen_random_uuid()::text, true);
insert into auth.users (id, email, aud, role, raw_user_meta_data)
select id::uuid, 'consent-test-' || id || '@example.invalid', 'authenticated', 'authenticated', '{}'::jsonb
from (values (current_setting('kff.test_owner')), (current_setting('kff.test_other'))) fixtures(id);
do $$
begin
  if (select count(*) from public.communication_preferences
      where user_id in (current_setting('kff.test_owner')::uuid, current_setting('kff.test_other')::uuid)
        and not price_alert_email and not market_brief_email and price_alert_inapp and not email_welcome_completed) <> 2 then
    raise exception 'New signup defaults or preference trigger failed';
  end if;
  if has_column_privilege('authenticated', 'public.communication_preferences', 'user_id', 'UPDATE')
      or has_table_privilege('authenticated', 'public.communication_preferences', 'INSERT')
      or has_column_privilege('anon', 'public.communication_preferences', 'email_welcome_completed', 'UPDATE') then
    raise exception 'Unexpected preference write privileges';
  end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('kff.test_owner'), true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.communication_preferences) <> 1 then
    raise exception 'Owner-only read isolation failed';
  end if;
  if has_column_privilege('authenticated', 'public.communication_preferences', 'price_alert_email', 'UPDATE')
      or has_column_privilege('authenticated', 'public.communication_preferences', 'market_brief_email', 'UPDATE')
      or has_column_privilege('authenticated', 'public.communication_preferences', 'email_welcome_completed', 'UPDATE') then
    raise exception 'Direct email preference bypass remains available';
  end if;
end $$;
reset role;

set local role service_role;
select public.update_communication_preferences_service(
  current_setting('kff.test_owner')::uuid,
  'consent-test-' || current_setting('kff.test_owner') || '@example.invalid',
  true,
  true,
  true
);
reset role;

do $$
begin
  if not exists (select 1 from public.communication_preferences
    where user_id = current_setting('kff.test_owner')::uuid
      and price_alert_email and price_alert_email_consented_at is not null
      and market_brief_email and market_brief_email_consented_at is not null
      and email_welcome_completed and price_alert_inapp) then
    raise exception 'Saved choices and consent evidence did not persist';
  end if;
  if not exists (select 1 from public.communication_preferences where user_id = current_setting('kff.test_other')::uuid and not price_alert_email and not market_brief_email and not email_welcome_completed) then
    raise exception 'Other account changed';
  end if;
end $$;

set local role service_role;
select public.update_communication_preferences_service(
  current_setting('kff.test_owner')::uuid,
  'consent-test-' || current_setting('kff.test_owner') || '@example.invalid',
  false,
  false,
  true
);
reset role;

do $$
begin
  if not exists (select 1 from public.communication_preferences
    where user_id = current_setting('kff.test_owner')::uuid
      and not price_alert_email and price_alert_email_consented_at is null
      and not market_brief_email and market_brief_email_consented_at is null
      and email_welcome_completed) then
    raise exception 'Opt-out did not clear consent evidence';
  end if;
end $$;
select pass('signup defaults, endpoint save, opt-out, and cross-account isolation are enforced');
select * from finish();
rollback;
