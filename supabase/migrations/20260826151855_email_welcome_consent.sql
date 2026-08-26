-- Existing accounts keep their preferences and do not enter new-user onboarding.
-- Adding with TRUE first preserves that status without rewriting email choices.
alter table public.communication_preferences
  add column email_welcome_completed boolean not null default true;

-- Only future inserts (including the existing auth.users signup trigger) get
-- the welcome step and explicit opt-in defaults. No existing consent is changed.
alter table public.communication_preferences
  alter column email_welcome_completed set default false,
  alter column price_alert_email set default false;

-- Existing owner-only SELECT/UPDATE RLS remains in force. No insert or user_id
-- update permission is added, and no queues, schedules, or senders are touched.
grant update (email_welcome_completed)
  on public.communication_preferences to authenticated;
