BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(17);

SELECT has_table('public', 'push_subscriptions', 'push subscriptions are stored separately from email preferences');
SELECT has_table('public', 'notification_presence', 'active app presence is stored privately');
SELECT has_table('public', 'push_notification_dispatches', 'push dispatches are idempotently recorded');
SELECT has_column('public', 'push_notification_dispatches', 'event_key', 'push dispatches remain idempotent even when in-app notifications are disabled');
SELECT has_column('public', 'communication_preferences', 'price_alert_push', 'device push has an explicit preference');
SELECT has_column('public', 'communication_preferences', 'price_alert_push_consented_at', 'device push consent timestamp is recorded');
SELECT col_default_is('public', 'communication_preferences', 'price_alert_push', 'false', 'device push defaults off');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.push_subscriptions'::regclass), 'push subscriptions have RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notification_presence'::regclass), 'presence has RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.push_notification_dispatches'::regclass), 'dispatch log has RLS');
SELECT ok(has_table_privilege('authenticated', 'public.push_subscriptions', 'SELECT'), 'users can see only subscriptions allowed by RLS');
SELECT ok(NOT has_table_privilege('authenticated', 'public.push_subscriptions', 'INSERT'), 'users cannot forge device subscriptions directly');
SELECT ok(NOT has_table_privilege('authenticated', 'public.push_notification_dispatches', 'SELECT'), 'users cannot inspect another device dispatch history');
SELECT ok(has_column_privilege('authenticated', 'public.communication_preferences', 'price_alert_push', 'UPDATE'), 'users can set their own device notification choice');

SELECT has_function('private', 'broadcast_notification_created', ARRAY[]::text[], 'notification broadcast helper exists');
SELECT ok(NOT has_function_privilege('authenticated', 'private.broadcast_notification_created()', 'EXECUTE'), 'users cannot invoke broadcast helper directly');
SELECT ok(
  (SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.notifications'::regclass
      AND tgname = 'broadcast_notification_created'
      AND NOT tgisinternal
  )),
  'new notifications are broadcast only after their row is committed'
);

SELECT * FROM finish();
ROLLBACK;
