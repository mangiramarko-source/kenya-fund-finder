-- Run after the migration. Fixtures and all updates are rolled back; no Auth API
-- or email endpoint is invoked. Only generated, transaction-local users are used.
begin;
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
declare affected integer;
begin
  if (select count(*) from public.communication_preferences) <> 1 then
    raise exception 'Owner-only read isolation failed';
  end if;
  update public.communication_preferences set price_alert_email = true, market_brief_email = true, email_welcome_completed = true
  where user_id = current_setting('kff.test_owner')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner update failed'; end if;
  if not exists (select 1 from public.communication_preferences where price_alert_email and market_brief_email and email_welcome_completed and price_alert_inapp) then
    raise exception 'Saved choices did not persist';
  end if;
  update public.communication_preferences set market_brief_email = true, email_welcome_completed = true
  where user_id = current_setting('kff.test_other')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-account update was allowed'; end if;
  update public.communication_preferences set price_alert_email = false, market_brief_email = false
  where user_id = current_setting('kff.test_owner')::uuid;
  if not exists (select 1 from public.communication_preferences where not price_alert_email and not market_brief_email and email_welcome_completed) then
    raise exception 'Opt-out failed';
  end if;
end $$;
reset role;
do $$
begin
  if not exists (select 1 from public.communication_preferences where user_id = current_setting('kff.test_other')::uuid and not price_alert_email and not market_brief_email and not email_welcome_completed) then
    raise exception 'Other account changed';
  end if;
end $$;
rollback;
select 'PASS: signup defaults, owner save, opt-out, cross-account isolation; fixtures rolled back' as result;
