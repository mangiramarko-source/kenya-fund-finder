-- P0 containment: authenticate scheduled Edge Function calls with a named
-- Supabase secret key in the apikey header. The key value stays in Vault and
-- is resolved at execution time; it is never persisted in cron.job.command.

do $migration$
declare
  missing_secrets text[];
  scheduled_job_count integer;
  target record;
begin
  select array_agg(required.name order by required.name)
    into missing_secrets
  from (
    values ('kff_project_url'), ('kff_automations_secret_key')
  ) as required(name)
  where not exists (
    select 1
    from vault.decrypted_secrets secrets
    where secrets.name = required.name
      and nullif(secrets.decrypted_secret, '') is not null
  );

  if missing_secrets is not null then
    raise exception 'Required Vault secret(s) missing: %', array_to_string(missing_secrets, ', ');
  end if;

  select count(*) into scheduled_job_count
  from cron.job
  where jobname in (
    'fetch-news-hourly',
    'fetch-news-cron',
    'fetch-social-news-schedule',
    'fetch-social-news-cron',
    'fetch-market-data-fx',
    'fetch-market-data-stocks'
  );

  if scheduled_job_count <> 6 then
    raise exception 'Expected 6 target cron jobs, found %', scheduled_job_count;
  end if;

  for target in
    select jobid
    from cron.job
    where jobname in ('fetch-news-hourly', 'fetch-news-cron')
  loop
    perform cron.alter_job(
      target.jobid,
      command := $command$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-news',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{}'::jsonb
        );
      $command$
    );
  end loop;

  for target in
    select jobid
    from cron.job
    where jobname in ('fetch-social-news-schedule', 'fetch-social-news-cron')
  loop
    perform cron.alter_job(
      target.jobid,
      command := $command$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-social-news',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{}'::jsonb
        );
      $command$
    );
  end loop;

  select jobid into target
  from cron.job
  where jobname = 'fetch-market-data-fx';

  if found then
    perform cron.alter_job(
      target.jobid,
      command := $command$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-market-data',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{"fetch_type":"fx"}'::jsonb
        );
      $command$
    );
  end if;

  select jobid into target
  from cron.job
  where jobname = 'fetch-market-data-stocks';

  if found then
    perform cron.alter_job(
      target.jobid,
      command := $command$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-market-data',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{"fetch_type":"stocks"}'::jsonb
        );
      $command$
    );
  end if;
end
$migration$;
