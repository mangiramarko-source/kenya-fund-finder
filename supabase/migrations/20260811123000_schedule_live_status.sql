-- Keep automated market status metadata current. MMF remains manual.
DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('update-live-status-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

SELECT cron.schedule(
  'update-live-status-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://caawgzuofnujrznwbuxk.supabase.co/functions/v1/update-live-status',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
