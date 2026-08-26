BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(51);

SELECT has_table('public', 'user_watchlist', 'user_watchlist exists');
SELECT has_table('public', 'price_alerts', 'price_alerts exists');
SELECT has_table('public', 'notifications', 'notifications exists');
SELECT has_table('public', 'market_overviews', 'market_overviews exists');
SELECT has_table('public', 'communication_preferences', 'communication_preferences exists');
SELECT has_table('public', 'communication_outbox', 'communication_outbox exists');
SELECT has_table('public', 'communication_suppressions', 'communication_suppressions exists');
SELECT has_table('public', 'news_highlights_editions', 'news_highlights_editions exists');

SELECT has_function('public', 'claim_price_alert_event', ARRAY['uuid', 'numeric', 'timestamp with time zone', 'boolean'], 'atomic alert claim exists');
SELECT has_function('public', 'claim_communication_batch', ARRAY['integer', 'integer'], 'outbox batch claim exists');
SELECT has_function('public', 'claim_communication_category_batch', ARRAY['text', 'integer', 'integer', 'uuid[]'], 'scoped category outbox batch claim exists');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.user_watchlist'::regclass), 'watchlist RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.price_alerts'::regclass), 'alerts RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notifications'::regclass), 'notifications RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.market_overviews'::regclass), 'overview RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.communication_preferences'::regclass), 'preferences RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.communication_outbox'::regclass), 'outbox RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.communication_suppressions'::regclass), 'suppression RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.news_highlights_editions'::regclass), 'News Highlights editions RLS enabled');

SELECT ok(has_table_privilege('authenticated', 'public.user_watchlist', 'SELECT'), 'authenticated can select watchlist');
SELECT ok(has_table_privilege('authenticated', 'public.user_watchlist', 'INSERT'), 'authenticated can insert watchlist');
SELECT ok(has_table_privilege('authenticated', 'public.price_alerts', 'SELECT'), 'authenticated can select alerts');
SELECT ok(has_table_privilege('authenticated', 'public.notifications', 'SELECT'), 'authenticated can select notifications');
SELECT ok(NOT has_table_privilege('authenticated', 'public.notifications', 'INSERT'), 'authenticated cannot insert notifications');
SELECT ok(has_column_privilege('authenticated', 'public.notifications', 'is_read', 'UPDATE'), 'authenticated can mark own notifications read');
SELECT ok(NOT has_column_privilege('authenticated', 'public.price_alerts', 'trigger_count', 'UPDATE'), 'authenticated cannot alter alert trigger counts');
SELECT ok(NOT has_table_privilege('authenticated', 'public.communication_outbox', 'SELECT'), 'authenticated cannot read outbox');
SELECT ok(NOT has_table_privilege('authenticated', 'public.communication_suppressions', 'SELECT'), 'authenticated cannot read suppressions');
SELECT ok(NOT has_table_privilege('authenticated', 'public.news_highlights_editions', 'SELECT'), 'authenticated cannot read News Highlights editions');
SELECT ok(NOT has_table_privilege('authenticated', 'public.communication_preferences', 'INSERT'), 'authenticated cannot create preference rows');
SELECT ok(NOT has_function_privilege('authenticated', 'public.claim_price_alert_event(uuid,numeric,timestamp with time zone,boolean)', 'EXECUTE'), 'authenticated cannot claim alerts');
SELECT ok(NOT has_function_privilege('anon', 'public.claim_communication_batch(integer,integer)', 'EXECUTE'), 'anon cannot claim outbox');
SELECT ok(NOT has_function_privilege('authenticated', 'public.claim_communication_category_batch(text,integer,integer,uuid[])', 'EXECUTE'), 'authenticated cannot claim category outbox');
SELECT is(
  (SELECT pg_get_expr(d.adbin, d.adrelid)
   FROM pg_attrdef d
   JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
   WHERE d.adrelid = 'public.communication_preferences'::regclass
     AND a.attname = 'market_brief_email'),
  'false',
  'Market Brief defaults to explicit opt-in'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.price_alerts', 'is_triggered', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.price_alerts', 'trigger_count', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.price_alerts', 'last_evaluated_at', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.price_alerts', 'triggered_at', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.price_alerts', 'triggered_price', 'UPDATE'),
  'authenticated cannot update service-controlled alert state'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.price_alerts', 'is_triggered', 'INSERT')
  AND NOT has_column_privilege('authenticated', 'public.price_alerts', 'trigger_count', 'INSERT')
  AND NOT has_column_privilege('authenticated', 'public.price_alerts', 'last_evaluated_at', 'INSERT')
  AND NOT has_column_privilege('authenticated', 'public.price_alerts', 'triggered_at', 'INSERT')
  AND NOT has_column_privilege('authenticated', 'public.price_alerts', 'triggered_price', 'INSERT'),
  'authenticated cannot forge service-controlled alert state at insert'
);
SELECT ok(
  has_column_privilege('service_role', 'public.price_alerts', 'is_triggered', 'UPDATE')
  AND has_column_privilege('service_role', 'public.price_alerts', 'trigger_count', 'UPDATE')
  AND has_column_privilege('service_role', 'public.price_alerts', 'last_evaluated_at', 'UPDATE')
  AND has_column_privilege('service_role', 'public.price_alerts', 'triggered_at', 'UPDATE')
  AND has_column_privilege('service_role', 'public.price_alerts', 'triggered_price', 'UPDATE'),
  'service role can update service-controlled alert state'
);

SELECT is(
  (SELECT count(*)::integer FROM public.communication_preferences
   WHERE market_brief_email = true
     AND market_brief_email_consented_at IS NULL),
  0,
  'backfilled Market Brief opt-ins always retain consent evidence'
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'mvp-a@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'mvp-b@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

SELECT is(
  (SELECT count(*)::integer FROM public.communication_preferences WHERE user_id IN ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')),
  2,
  'signup trigger creates default communication preferences'
);
SELECT is(
  (SELECT count(*)::integer FROM public.communication_preferences
   WHERE user_id IN ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')
     AND market_brief_email = false),
  2,
  'new users receive Market Brief disabled'
);
SELECT is(
  (SELECT count(*)::integer FROM public.communication_outbox WHERE category = 'market_brief'),
  0,
  'migration and preference creation enqueue no Market Brief messages'
);

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.communication_preferences', 'market_brief_email', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.communication_preferences', 'price_alert_email', 'UPDATE'),
  'authenticated users cannot bypass the consent endpoint'
);
SET LOCAL ROLE service_role;
SELECT public.update_communication_preferences_service(
  '10000000-0000-0000-0000-000000000001',
  'mvp-a@example.com',
  true,
  true,
  true
);
RESET ROLE;
SELECT ok(
  (SELECT market_brief_email AND market_brief_email_consented_at IS NOT NULL
      AND price_alert_email AND price_alert_email_consented_at IS NOT NULL
   FROM public.communication_preferences
   WHERE user_id = '10000000-0000-0000-0000-000000000001'),
  'service endpoint records explicit consent evidence'
);
SELECT is(
  (SELECT market_brief_email FROM public.communication_preferences
   WHERE user_id = '10000000-0000-0000-0000-000000000002'),
  false,
  'updating user A does not modify user B preferences'
);

INSERT INTO public.stocks (id, symbol, name, price, previous_price)
VALUES ('20000000-0000-0000-0000-000000000001', 'MVPT', 'MVP Test Stock', 110, 100);
INSERT INTO public.price_alerts (
  id, user_id, stock_id, asset_type, asset_id, asset_name,
  condition, target_price, notify_email, notify_inapp
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'stock',
  '20000000-0000-0000-0000-000000000001',
  'MVP Test Stock',
  'above',
  105,
  true,
  true
);

SET LOCAL ROLE service_role;
SELECT is(
  (SELECT count(*)::integer FROM public.claim_price_alert_event('30000000-0000-0000-0000-000000000001', 110, now(), true)),
  1,
  'first alert claim succeeds'
);
SELECT is(
  (SELECT count(*)::integer FROM public.claim_price_alert_event('30000000-0000-0000-0000-000000000001', 110, now(), true)),
  0,
  'duplicate alert claim is ignored'
);
SELECT is((SELECT count(*)::integer FROM public.notifications WHERE event_key = 'price_alert:30000000-0000-0000-0000-000000000001:trigger:1'), 1, 'one notification is created');
SELECT is((SELECT count(*)::integer FROM public.communication_outbox WHERE idempotency_key = 'price_alert:30000000-0000-0000-0000-000000000001:trigger:1'), 1, 'one outbox event is created');
SELECT ok(
  (SELECT is_triggered AND NOT is_active AND trigger_count = 1
   FROM public.price_alerts WHERE id = '30000000-0000-0000-0000-000000000001'),
  'service claim performs exactly one trigger transition and increment'
);
SELECT ok(
  (SELECT last_evaluated_at IS NOT NULL AND triggered_at IS NOT NULL AND triggered_price = 110
   FROM public.price_alerts WHERE id = '30000000-0000-0000-0000-000000000001'),
  'service claim records evaluation metadata'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.price_alerts), 0, 'another authenticated user cannot read the alert');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
