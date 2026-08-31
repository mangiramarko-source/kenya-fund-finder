\set ON_ERROR_STOP on
-- Only for an empty disposable PostgreSQL database. Never run on production.
DO $$ BEGIN
  IF current_database() <> 'kff_summary_migration_test' OR to_regclass('public.market_summary_history') IS NOT NULL THEN
    RAISE EXCEPTION 'Requires empty disposable kff_summary_migration_test database';
  END IF;
END $$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
-- Simulate permissive legacy defaults to verify this migration overrides them.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO PUBLIC, anon, authenticated, service_role;

\ir ../supabase/migrations/20260831172126_restore_market_summary_history.sql

DO $$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.market_summary_history'::regclass) THEN
    RAISE EXCEPTION 'RLS not enabled';
  END IF;
  IF (SELECT count(*) FROM public.market_summary_history) <> 0 THEN
    RAISE EXCEPTION 'Migration created invented history';
  END IF;
END $$;

SET ROLE service_role;
INSERT INTO public.market_summary_history(date,total_market_cap,average_pe,advances,declines,unchanged)
VALUES ('2026-08-31',123456789000.25,9.50,20,15,10)
ON CONFLICT (date) DO UPDATE SET advances=excluded.advances;
RESET ROLE;
CREATE TEMP TABLE first_summary AS SELECT id,created_at FROM public.market_summary_history;
SET ROLE service_role;
INSERT INTO public.market_summary_history(date,total_market_cap,average_pe,advances,declines,unchanged)
VALUES ('2026-08-31',123456789100.50,9.75,21,14,10)
ON CONFLICT (date) DO UPDATE SET total_market_cap=excluded.total_market_cap,average_pe=excluded.average_pe,
  advances=excluded.advances,declines=excluded.declines,unchanged=excluded.unchanged;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.market_summary_history) <> 1 THEN RAISE EXCEPTION 'Upsert duplicated the date'; END IF;
  IF NOT EXISTS (SELECT 1 FROM first_summary old JOIN public.market_summary_history new USING(id,created_at)) THEN
    RAISE EXCEPTION 'Upsert changed identity or creation time';
  END IF;
END $$;

SET ROLE anon;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.market_summary_history WHERE advances=21 AND total_market_cap=123456789100.50) THEN
    RAISE EXCEPTION 'Anonymous read failed';
  END IF;
  BEGIN
    INSERT INTO public.market_summary_history(date) VALUES ('2026-09-01');
    RAISE EXCEPTION 'Anonymous insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.market_summary_history SET advances=999;
    RAISE EXCEPTION 'Anonymous update allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.market_summary_history;
    RAISE EXCEPTION 'Anonymous delete allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    TRUNCATE public.market_summary_history;
    RAISE EXCEPTION 'Anonymous truncate allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SET ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.market_summary_history) <> 1 THEN RAISE EXCEPTION 'Authenticated read failed'; END IF;
  BEGIN
    INSERT INTO public.market_summary_history(date) VALUES ('2026-09-01');
    RAISE EXCEPTION 'Authenticated insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.market_summary_history SET advances=999;
    RAISE EXCEPTION 'Authenticated update allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.market_summary_history;
    RAISE EXCEPTION 'Authenticated delete allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SELECT 'PASS: empty migration, daily upsert, stable identity, RLS, public reads and blocked client writes' AS result;
