-- ============================================================
-- Schedule automatic fetching for news and social news
-- fetch-news: Every 3 hours
-- fetch-social-news: Every 6 hours
-- ============================================================

DO $$
BEGIN
  -- Unschedule existing routines to avoid duplicates if re-run
  BEGIN PERFORM cron.unschedule('fetch-news-cron');         EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('fetch-social-news-cron');  EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- 1. General News: Every 3 hours
-- Cron format: '0 */3 * * *'
SELECT cron.schedule(
  'fetch-news-cron',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://caawgzuofnujrznwbuxk.supabase.co/functions/v1/fetch-news',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- 2. Social News: Every 6 hours
-- Cron format: '0 */6 * * *'
SELECT cron.schedule(
  'fetch-social-news-cron',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://caawgzuofnujrznwbuxk.supabase.co/functions/v1/fetch-social-news',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
