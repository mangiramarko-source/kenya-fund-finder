-- ============================================================
-- Fix: Market data snapshot cron (July 2026)
--
-- Problem: The fetch-market-data edge function cron has been
-- failing since July 1 due to an auth regression in the deployed
-- edge function version. As a result, no live price updates have
-- been applied and no snapshot history rows written.
--
-- Fix (Part 1): Add a pure-SQL daily snapshot function that
-- copies current prices into history tables regardless of whether
-- the edge function runs. Scheduled via pg_cron at 18:05 EAT daily.
--
-- Fix (Part 2): Re-schedule the edge function cron with an empty
-- JSON body (the deployed version's required format). The edge
-- function auth fix (commit c43e5ca) will take effect once the
-- function is redeployed via the Supabase dashboard.
-- ============================================================

-- ── 1. Daily SQL-based snapshot function ──────────────────────

CREATE OR REPLACE FUNCTION public.take_daily_market_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today date := CURRENT_DATE;
BEGIN
  -- ── FX rate snapshots ──
  INSERT INTO public.exchange_rate_history (exchange_rate_id, rate, snapshot_date)
  SELECT id, rate, today
  FROM   public.exchange_rates
  WHERE  is_active = true
  ON CONFLICT (exchange_rate_id, snapshot_date)
  DO UPDATE SET rate = EXCLUDED.rate;

  -- ── Commodity price snapshots ──
  INSERT INTO public.commodity_price_history (commodity_id, price, snapshot_date)
  SELECT id, price, today
  FROM   public.commodities
  WHERE  is_active = true
  ON CONFLICT (commodity_id, snapshot_date)
  DO UPDATE SET price = EXCLUDED.price;

  -- ── Stock price snapshots ──
  INSERT INTO public.stock_price_history (stock_id, price, snapshot_date)
  SELECT id, price, today
  FROM   public.stocks
  WHERE  is_active = true
  ON CONFLICT (stock_id, snapshot_date)
  DO UPDATE SET price = EXCLUDED.price;

  RAISE LOG '[take_daily_market_snapshot] Snapshot completed for %', today;
END;
$$;

-- Grant execute only to service_role (called by pg_cron which runs as superuser)
REVOKE EXECUTE ON FUNCTION public.take_daily_market_snapshot() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.take_daily_market_snapshot() TO service_role;

-- ── 2. Schedule SQL snapshot at 18:05 EAT (15:05 UTC) every weekday ──
-- This runs AFTER market close to lock in the day's closing prices.
SELECT cron.schedule(
  'daily-market-snapshot',
  '5 15 * * 1-5',   -- weekdays at 15:05 UTC = 18:05 EAT
  $$ SELECT public.take_daily_market_snapshot(); $$
);

-- Also run on weekends so FX/crypto (24/7 markets) stay current
SELECT cron.schedule(
  'daily-market-snapshot-weekend',
  '5 15 * * 0,6',
  $$ SELECT public.take_daily_market_snapshot(); $$
);

-- ── 3. Unschedule the old broken cron and replace it ──
-- The old cron (job id depends on DB state) sent an empty body {}
-- which caused auth failure. We keep the new schedule but add
-- fetch_type variations for lighter incremental calls.
DO $$
BEGIN
  -- Remove existing schedules if they exist (safe to ignore errors)
  BEGIN PERFORM cron.unschedule('fetch-market-data-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('fetch-market-data-fx');     EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('fetch-market-data-stocks'); EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- Re-schedule FX + commodities every hour (lightweight)
-- NOTE: Replace ANON_KEY_HERE with the actual anon key once confirmed
SELECT cron.schedule(
  'fetch-market-data-fx',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://caawgzuofnujrznwbuxk.supabase.co/functions/v1/fetch-market-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA"}'::jsonb,
    body    := '{"fetch_type": "fx"}'::jsonb
  );
  $$
);

-- Stocks: once a day during NSE trading hours (Mon–Fri, 12:00 UTC = 15:00 EAT)
SELECT cron.schedule(
  'fetch-market-data-stocks',
  '0 12 * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://caawgzuofnujrznwbuxk.supabase.co/functions/v1/fetch-market-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA"}'::jsonb,
    body    := '{"fetch_type": "stocks"}'::jsonb
  );
  $$
);
