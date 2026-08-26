-- POST-NEWS-PILOT ACTIVATION ONLY. Do not run until a successful News
-- Highlights production run has been reviewed. Generates at 18:00 EAT,
-- enqueues today's ready overview at 18:15, and processes only Market Brief.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'kff_project_url' and nullif(decrypted_secret, '') is not null)
     or not exists (select 1 from vault.decrypted_secrets where name = 'kff_automations_secret_key' and nullif(decrypted_secret, '') is not null) then
    raise exception 'Required communication Vault secrets are missing';
  end if;
  if exists (select 1 from cron.job where jobname in ('market-overview-weekdays', 'market-brief-weekdays', 'process-market-brief')) then
    raise exception 'Market Brief automation already exists';
  end if;
end $$;

select cron.schedule(
  'market-overview-weekdays',
  '0 15 * * 1-5',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/generate-market-overview',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
      ),
      body := '{"use_ai":true,"enforce_after_close":true}'::jsonb
    );
  $job$
);

select cron.schedule(
  'market-brief-weekdays',
  '15 15 * * 1-5',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/enqueue-market-brief',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
      ),
      body := '{}'::jsonb
    );
  $job$
);

select cron.schedule(
  'process-market-brief',
  '* * * * *',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/process-communication-outbox',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
      ),
      body := '{"category":"market_brief","batch_size":5}'::jsonb
    );
  $job$
);
commit;
