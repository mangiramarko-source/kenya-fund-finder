-- Increase net.http_post timeout for social news cron jobs to 120 seconds
-- Apify social media scraping requires 20-50s to complete.

do $$
declare
  target record;
begin
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
          body := '{}'::jsonb,
          timeout_milliseconds := 120000
        );
      $command$
    );
  end loop;
end $$;
