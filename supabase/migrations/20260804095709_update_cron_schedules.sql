-- ============================================================
-- Update cron schedules to match required market hours
-- Stocks: 9 AM to 5 PM EAT (Mon-Fri)
-- FX & Commodities: 24h (Mon-Fri)
-- ============================================================

DO $$
BEGIN
  -- Unschedule existing routines to avoid duplicates
  BEGIN PERFORM cron.unschedule('fetch-market-data-fx');     EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('fetch-market-data-stocks'); EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- 1. FX and Commodities: 24h but Monday to Friday only
-- Cron format: minute hour day month day-of-week
-- '0 * * * 1-5' means every hour on Mon-Fri
SELECT cron.schedule(
  'fetch-market-data-fx',
  '0 * * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://caawgzuofnujrznwbuxk.supabase.co/functions/v1/fetch-market-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA"}'::jsonb,
    body    := '{"fetch_type": "fx"}'::jsonb
  );
  $$
);

-- 2. Stocks: 9:00 AM to 5:00 PM EAT (Mon-Fri)
-- EAT is UTC+3. 
-- 9 AM EAT = 6 AM UTC
-- 5 PM EAT = 14:00 UTC (14)
-- Cron format: '0 6-14 * * 1-5'
SELECT cron.schedule(
  'fetch-market-data-stocks',
  '0 6-14 * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://caawgzuofnujrznwbuxk.supabase.co/functions/v1/fetch-market-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA"}'::jsonb,
    body    := '{"fetch_type": "stocks"}'::jsonb
  );
  $$
);
