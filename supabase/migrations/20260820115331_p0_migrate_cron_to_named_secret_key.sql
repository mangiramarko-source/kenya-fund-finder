-- P0 containment: authenticate scheduled Edge Function calls with a named
-- Supabase secret key in the apikey header. The key value stays in Vault and
-- is resolved at execution time; it is never persisted in cron.job.command.

do $migration$
declare
  missing_secrets text[];
  missing_jobs text[];
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

  -- A clean history contains the four canonical jobs. Some production
  -- histories also retain the two legacy news jobs, which are migrated by the
  -- loops below when present but are not prerequisites for a safe replay.
  select array_agg(required.name order by required.name)
    into missing_jobs
  from (
    values
      ('fetch-news-cron'),
      ('fetch-social-news-cron'),
      ('fetch-market-data-fx'),
      ('fetch-market-data-stocks')
  ) as required(name)
  where not exists (
    select 1
    from cron.job jobs
    where jobs.jobname = required.name
  );

  if missing_jobs is not null then
    raise exception 'Required cron job(s) missing: %', array_to_string(missing_jobs, ', ');
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
