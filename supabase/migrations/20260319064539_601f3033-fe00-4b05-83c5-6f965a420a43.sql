SELECT cron.unschedule(1);

SELECT cron.schedule(
  'fetch-market-data-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qrmthciurngpzpjhevdj.supabase.co/functions/v1/fetch-market-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybXRoY2l1cm5ncHpwamhldmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1ODksImV4cCI6MjA4Nzg1MDU4OX0.WeQLthaDLzYdmSjY_tt4_ZClx68aXQe3EOjn314yygs"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);