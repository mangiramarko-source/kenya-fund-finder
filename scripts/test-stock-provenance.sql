\set ON_ERROR_STOP on
-- Run only in an EMPTY disposable database, never against a linked project.
DO $$ BEGIN
  IF current_database() <> 'kff_nse_migration_test' OR to_regclass('public.stocks') IS NOT NULL THEN
    RAISE EXCEPTION 'Requires an empty disposable kff_nse_migration_test database';
  END IF;
END $$;

CREATE TABLE public.stocks (
  id uuid PRIMARY KEY, symbol text UNIQUE NOT NULL, name text, sector text,
  price numeric, previous_price numeric, day_change numeric, day_change_percent numeric,
  volume bigint, market_cap numeric, year_high numeric, year_low numeric,
  pe_ratio numeric, dividend_yield numeric, is_active boolean, sort_order integer,
  updated_at timestamptz
);
CREATE TABLE public.stock_price_history (
  id uuid PRIMARY KEY, stock_id uuid REFERENCES public.stocks(id), price numeric, snapshot_date date
);
INSERT INTO public.stocks (id, symbol, name, price, is_active, updated_at) VALUES
  ('850dc3e0-d996-42e5-b0d8-7c7732b4c6c2', 'NSE20', 'Nairobi Securities Exchange PLC', 19.65, true, '2026-08-28T15:00:00Z'),
  ('00000000-0000-0000-0000-000000000002', 'SCOM', 'Safaricom', 37.05, true, '2026-08-28T15:00:00Z');
INSERT INTO public.stock_price_history VALUES
  ('00000000-0000-0000-0000-000000000003', '850dc3e0-d996-42e5-b0d8-7c7732b4c6c2', 19.65, '2026-08-28');
CREATE VIEW public.stocks_public WITH (security_invoker = true) AS
SELECT id, symbol, name, sector, price, previous_price, day_change, day_change_percent,
       volume, market_cap, year_high, year_low, pe_ratio, dividend_yield, is_active,
       sort_order, updated_at FROM public.stocks WHERE is_active = true;
CREATE ROLE stock_provenance_reader NOLOGIN;
GRANT SELECT ON public.stocks, public.stocks_public TO stock_provenance_reader;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY test_stock_scope ON public.stocks FOR SELECT TO stock_provenance_reader USING (symbol = 'NSE20');
CREATE TEMP TABLE old_stocks AS SELECT to_jsonb(s) AS row FROM public.stocks s;
CREATE TEMP TABLE old_view AS SELECT oid, relacl, reloptions FROM pg_class WHERE oid = 'public.stocks_public'::regclass;

\ir ../supabase/migrations/20260831161801_stock_quote_provenance.sql

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM public.stocks WHERE provider_updated_at IS NOT NULL OR quote_source IS NOT NULL
  ) THEN RAISE EXCEPTION 'Migration invented legacy provenance'; END IF;
  IF EXISTS (
    SELECT row FROM old_stocks EXCEPT SELECT to_jsonb(s) - 'provider_updated_at' - 'quote_source' FROM public.stocks s
  ) THEN RAISE EXCEPTION 'Migration changed existing stock data'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM old_view old JOIN pg_class new ON old.oid = new.oid
    WHERE old.relacl = new.relacl AND old.reloptions = new.reloptions
  ) THEN RAISE EXCEPTION 'View identity, grants or security options changed'; END IF;
  IF (SELECT count(*) FROM public.stock_price_history h JOIN public.stocks s ON s.id = h.stock_id WHERE s.symbol = 'NSE20') <> 1
    THEN RAISE EXCEPTION 'Stock identity/history reference was lost'; END IF;
END $$;

SET ROLE stock_provenance_reader;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.stocks_public) <> 1 THEN
    RAISE EXCEPTION 'View no longer respects underlying RLS';
  END IF;
END $$;
RESET ROLE;

UPDATE public.stocks SET provider_updated_at = '2026-08-31T18:20:07.022+03:00', quote_source = 'rapidapi'
WHERE symbol = 'NSE20';
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stocks_public WHERE symbol = 'NSE20'
      AND provider_updated_at = '2026-08-31T15:20:07.022Z'::timestamptz
      AND quote_source = 'rapidapi' AND updated_at = '2026-08-28T15:00:00Z'::timestamptz
  ) THEN RAISE EXCEPTION 'Provenance not exposed or confused with write time'; END IF;
  BEGIN
    UPDATE public.stocks SET quote_source = 'unknown_provider' WHERE symbol = 'NSE20';
    RAISE EXCEPTION 'Invalid source was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
SELECT 'PASS: additive columns, unchanged data/history, view grants/RLS, timestamps and source constraint' AS result;
