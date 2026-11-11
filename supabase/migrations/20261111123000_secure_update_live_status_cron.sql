-- Secure update-live-status-hourly cron job by injecting Vault secrets for the apikey header.
do $migration$
declare
  target record;
begin
  for target in
    select jobid
    from cron.job
    where jobname = 'update-live-status-hourly'
  loop
    perform cron.alter_job(
      target.jobid,
      command := $command$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/update-live-status',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{}'::jsonb
        );
      $command$
    );
  end loop;
end;
$migration$;
