-- POST-PILOT ACTIVATION ONLY. Do not run during implementation or preflight.
-- Enables the first rollout stream: weekday 06:15 EAT News Highlights plus
-- its category-isolated delivery worker.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'kff_project_url' and nullif(decrypted_secret, '') is not null)
     or not exists (select 1 from vault.decrypted_secrets where name = 'kff_automations_secret_key' and nullif(decrypted_secret, '') is not null) then
    raise exception 'Required communication Vault secrets are missing';
  end if;
  if exists (select 1 from cron.job where jobname in ('news-highlights-weekdays', 'process-news-highlights')) then
    raise exception 'News Highlights automation already exists';
  end if;
end $$;

select cron.schedule(
  'news-highlights-weekdays',
  '15 3 * * 1-5',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/run-news-highlights-edition',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
      ),
      body := '{}'::jsonb
    );
  $job$
);

select cron.schedule(
  'process-news-highlights',
  '* * * * *',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/process-communication-outbox',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
      ),
      body := '{"category":"news_highlights","batch_size":5}'::jsonb
    );
  $job$
);
commit;
