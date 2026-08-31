BEGIN;
SET LOCAL lock_timeout = '5s';

-- This dependency is already read by StocksPage and written by fetch-market-data.
-- Deliberately fail if a concurrent change created it; do not mask schema drift.
CREATE TABLE public.market_summary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  total_market_cap numeric,
  average_pe numeric,
  advances integer,
  declines integer,
  unchanged integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_summary_history_date_key UNIQUE (date)
);

COMMENT ON TABLE public.market_summary_history IS
  'Daily KFF aggregates of tracked active stocks, not an official NSE index. Populated by stock ingestion; no synthetic historical backfill.';

ALTER TABLE public.market_summary_history ENABLE ROW LEVEL SECURITY;

-- Override any legacy automatic grants on this table only.
REVOKE ALL ON TABLE public.market_summary_history FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.market_summary_history TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.market_summary_history TO service_role;

CREATE POLICY "Public can read market summary history"
  ON public.market_summary_history
  FOR SELECT TO anon, authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
COMMIT;
