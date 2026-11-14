-- Expand in-app notification preferences and schedule automated market notifications.

alter table public.communication_preferences
  add column if not exists portfolio_daily_inapp boolean not null default true,
  add column if not exists watchlist_mover_inapp boolean not null default true,
  add column if not exists mmf_yield_inapp boolean not null default true,
  add column if not exists tbill_auction_inapp boolean not null default true,
  add column if not exists market_brief_inapp boolean not null default true,
  add column if not exists admin_broadcast_inapp boolean not null default true;

grant update (
  portfolio_daily_inapp,
  watchlist_mover_inapp,
  mmf_yield_inapp,
  tbill_auction_inapp,
  market_brief_inapp,
  admin_broadcast_inapp
) on public.communication_preferences to authenticated;

-- Run after weekday market close / daily fund & overview updates.
-- 14:20 UTC = 17:20 EAT (Africa/Nairobi).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    begin perform cron.unschedule('create-market-notifications'); exception when others then null; end;

    perform cron.schedule(
      'create-market-notifications',
      '20 14 * * 1-5',
      $job$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/create-market-notifications',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  end if;
end
$$;
