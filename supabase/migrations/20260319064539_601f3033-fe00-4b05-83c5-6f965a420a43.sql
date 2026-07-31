SELECT cron.unschedule(1);

SELECT cron.schedule(
  'fetch-market-data-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://caawgzuofnujrznwbuxk.supabase.co/functions/v1/fetch-market-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);