-- Secure in-app and device notification delivery for price alerts.
-- Notifications remain owned by their account; only a minimal event is broadcast.

alter table public.communication_preferences
  add column if not exists price_alert_push boolean not null default false,
  add column if not exists price_alert_push_consented_at timestamptz;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create index if not exists push_subscriptions_active_user_idx
  on public.push_subscriptions (user_id)
  where is_active;

create table if not exists public.notification_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_notification_dispatches (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  notification_id uuid references public.notifications(id) on delete set null,
  push_subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'invalid', 'failed', 'suppressed')),
  provider_response text,
  created_at timestamptz not null default now(),
  attempted_at timestamptz,
  unique (event_key, push_subscription_id)
);

create or replace function private.broadcast_notification_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'id', new.id,
      'event_key', new.event_key,
      'type', new.type,
      'created_at', new.created_at
    ),
    'notification_created',
    'user:' || new.user_id::text || ':notifications',
    true
  );
  return new;
end;
$$;

revoke all on function private.broadcast_notification_created() from public;
drop trigger if exists broadcast_notification_created on public.notifications;
create trigger broadcast_notification_created
after insert on public.notifications
for each row execute function private.broadcast_notification_created();

alter table public.push_subscriptions enable row level security;
alter table public.notification_presence enable row level security;
alter table public.push_notification_dispatches enable row level security;

create policy "Users can read own push subscriptions"
on public.push_subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update own notification presence"
on public.notification_presence for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can receive own notification broadcasts"
on realtime.messages for select to authenticated
using (realtime.topic() = ('user:' || (select auth.uid())::text || ':notifications'));

revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.push_notification_dispatches from anon, authenticated;
revoke all on public.notification_presence from anon;
revoke all on public.notification_presence from authenticated;

grant select on public.push_subscriptions to authenticated;
grant select, insert, update on public.notification_presence to authenticated;
grant all on public.push_subscriptions to service_role;
grant all on public.notification_presence to service_role;
grant all on public.push_notification_dispatches to service_role;
grant update (price_alert_push, price_alert_push_consented_at) on public.communication_preferences to authenticated;

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions
for each row execute function private.set_updated_at();
drop trigger if exists set_notification_presence_updated_at on public.notification_presence;
create trigger set_notification_presence_updated_at before update on public.notification_presence
for each row execute function private.set_updated_at();
