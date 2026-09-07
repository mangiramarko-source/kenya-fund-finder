BEGIN;

SET LOCAL lock_timeout = '5s';

-- These reviewed records are intentionally separate from the live quote import.
-- source_url is an internal research trace and never appears in a public view.
CREATE TABLE public.stock_financial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  period_end date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('annual', 'half_year', 'quarterly')),
  period_label text NOT NULL,
  currency text NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  revenue numeric,
  operating_expense numeric,
  net_income numeric,
  eps numeric,
  net_margin numeric,
  operating_cash_flow numeric,
  total_assets numeric,
  total_liabilities numeric,
  total_equity numeric,
  source_url text NOT NULL CHECK (source_url ~ '^https://kenyanstocks[.]com/stock/nse/'),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stock_id, period_end, period_type)
);

CREATE TABLE public.stock_reference_metrics (
  stock_id uuid PRIMARY KEY REFERENCES public.stocks(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  isin text CHECK (isin ~ '^[A-Z]{2}[A-Z0-9]{10}$'),
  shares_issued bigint CHECK (shares_issued >= 0),
  book_value_per_share numeric CHECK (book_value_per_share >= 0),
  roe numeric,
  net_margin numeric,
  source_url text NOT NULL CHECK (source_url ~ '^https://kenyanstocks[.]com/stock/nse/'),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_shareholder_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  reported_as_of date NOT NULL,
  holder_rank integer NOT NULL CHECK (holder_rank > 0),
  holder_name text NOT NULL,
  shares bigint NOT NULL CHECK (shares >= 0),
  ownership_percent numeric NOT NULL CHECK (ownership_percent >= 0 AND ownership_percent <= 100),
  holding_value numeric CHECK (holding_value >= 0),
  currency text NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  source_url text NOT NULL CHECK (source_url ~ '^https://kenyanstocks[.]com/stock/nse/'),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stock_id, reported_as_of, holder_rank)
);

CREATE TABLE public.stock_filing_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 1900 AND 2200),
  filing_type text NOT NULL CHECK (filing_type IN ('financial_statement', 'integrated_report', 'sustainability_report', 'shareholding_structure', 'financial_report')),
  title text NOT NULL,
  published_at date,
  official_url text CHECK (official_url IS NULL OR official_url ~ '^https://'),
  source_url text NOT NULL CHECK (source_url ~ '^https://kenyanstocks[.]com/stock/nse/'),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stock_id, fiscal_year, filing_type, title)
);

CREATE INDEX stock_financial_periods_public_lookup_idx
  ON public.stock_financial_periods (stock_id, period_end DESC)
  WHERE is_published;
CREATE INDEX stock_shareholder_snapshots_public_lookup_idx
  ON public.stock_shareholder_snapshots (stock_id, reported_as_of DESC, holder_rank)
  WHERE is_published;
CREATE INDEX stock_filing_metadata_public_lookup_idx
  ON public.stock_filing_metadata (stock_id, fiscal_year DESC, published_at DESC)
  WHERE is_published;

ALTER TABLE public.stock_financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reference_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_shareholder_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_filing_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published stock financial periods" ON public.stock_financial_periods FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Public can read published stock reference metrics" ON public.stock_reference_metrics FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Public can read published stock shareholder snapshots" ON public.stock_shareholder_snapshots FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Public can read published stock filing metadata" ON public.stock_filing_metadata FOR SELECT TO anon, authenticated USING (is_published);

-- Security-invoker views and column grants prevent browser access to source_url,
-- review timestamps, and publication controls.
REVOKE ALL ON public.stock_financial_periods, public.stock_reference_metrics, public.stock_shareholder_snapshots, public.stock_filing_metadata FROM anon, authenticated;
GRANT SELECT (id, stock_id, period_end, period_type, period_label, currency, revenue, operating_expense, net_income, eps, net_margin, operating_cash_flow, total_assets, total_liabilities, total_equity, is_published) ON public.stock_financial_periods TO anon, authenticated;
GRANT SELECT (stock_id, as_of_date, isin, shares_issued, book_value_per_share, roe, net_margin, is_published) ON public.stock_reference_metrics TO anon, authenticated;
GRANT SELECT (id, stock_id, reported_as_of, holder_rank, holder_name, shares, ownership_percent, holding_value, currency, is_published) ON public.stock_shareholder_snapshots TO anon, authenticated;
GRANT SELECT (id, stock_id, fiscal_year, filing_type, title, published_at, official_url, is_published) ON public.stock_filing_metadata TO anon, authenticated;

CREATE VIEW public.stock_financial_periods_public WITH (security_invoker = true) AS
SELECT id, stock_id, period_end, period_type, period_label, currency, revenue, operating_expense, net_income, eps, net_margin, operating_cash_flow, total_assets, total_liabilities, total_equity
FROM public.stock_financial_periods WHERE is_published;
CREATE VIEW public.stock_reference_metrics_public WITH (security_invoker = true) AS
SELECT stock_id, as_of_date, isin, shares_issued, book_value_per_share, roe, net_margin
FROM public.stock_reference_metrics WHERE is_published;
CREATE VIEW public.stock_shareholder_snapshots_public WITH (security_invoker = true) AS
SELECT id, stock_id, reported_as_of, holder_rank, holder_name, shares, ownership_percent, holding_value, currency
FROM public.stock_shareholder_snapshots WHERE is_published;
CREATE VIEW public.stock_filings_public WITH (security_invoker = true) AS
SELECT id, stock_id, fiscal_year, filing_type, title, published_at, official_url
FROM public.stock_filing_metadata WHERE is_published;
GRANT SELECT ON public.stock_financial_periods_public, public.stock_reference_metrics_public, public.stock_shareholder_snapshots_public, public.stock_filings_public TO anon, authenticated;

-- ABSA is the reviewed first backfill. Amounts are KES; income statement and
-- balance sheet values are stored separately but share the same reporting period.
INSERT INTO public.stock_financial_periods (stock_id, period_end, period_type, period_label, revenue, operating_expense, net_income, eps, net_margin, operating_cash_flow, total_assets, total_liabilities, total_equity, source_url)
SELECT s.id, v.period_end, 'annual', v.period_label, v.revenue, v.operating_expense, v.net_income, v.eps, v.net_margin, v.operating_cash_flow, v.total_assets, v.total_liabilities, v.total_equity, 'https://kenyanstocks.com/stock/nse/ABSA?tab=Financials&category=assets'
FROM public.stocks s
CROSS JOIN (VALUES
  ('2025-12-31'::date, 'FY 2025', 78290000000::numeric, 53620000000::numeric, 24680000000::numeric, 4.54::numeric, 31.516::numeric, 0::numeric, 537650000000::numeric, 437130000000::numeric, 100520000000::numeric),
  ('2024-12-31'::date, 'FY 2024', 80120000000::numeric, 59240000000::numeric, 20880000000::numeric, 3.84::numeric, 26.057::numeric, 35060000000::numeric, 503650000000::numeric, 419620000000::numeric, 85200000000::numeric),
  ('2023-12-31'::date, 'FY 2023', 68480000000::numeric, 52110000000::numeric, 16370000000::numeric, 3.01::numeric, 23.901::numeric, 32530000000::numeric, 516600000000::numeric, 446760000000::numeric, 69190000000::numeric),
  ('2022-12-31'::date, 'FY 2022', 53140000000::numeric, 39280000000::numeric, 13870000000::numeric, 2.55::numeric, 26.091::numeric, 20340000000::numeric, 476750000000::numeric, 416480000000::numeric, 60810000000::numeric),
  ('2021-12-31'::date, 'FY 2021', 42700000000::numeric, 32400000000::numeric, 10300000000::numeric, 1.90::numeric, 24.118::numeric, 15850000000::numeric, 431520000000::numeric, 371660000000::numeric, 54350000000::numeric)
) AS v(period_end, period_label, revenue, operating_expense, net_income, eps, net_margin, operating_cash_flow, total_assets, total_liabilities, total_equity)
WHERE s.symbol = 'ABSA'
ON CONFLICT (stock_id, period_end, period_type) DO UPDATE SET revenue = EXCLUDED.revenue, operating_expense = EXCLUDED.operating_expense, net_income = EXCLUDED.net_income, eps = EXCLUDED.eps, net_margin = EXCLUDED.net_margin, operating_cash_flow = EXCLUDED.operating_cash_flow, total_assets = EXCLUDED.total_assets, total_liabilities = EXCLUDED.total_liabilities, total_equity = EXCLUDED.total_equity, reviewed_at = now(), updated_at = now();

INSERT INTO public.stock_reference_metrics (stock_id, as_of_date, isin, shares_issued, book_value_per_share, roe, net_margin, source_url)
SELECT id, '2025-12-31', 'KE0000000067', 5431536000, 18.51, 24.5, 31.516, 'https://kenyanstocks.com/stock/nse/ABSA?tab=Summary'
FROM public.stocks WHERE symbol = 'ABSA'
ON CONFLICT (stock_id) DO UPDATE SET as_of_date = EXCLUDED.as_of_date, isin = EXCLUDED.isin, shares_issued = EXCLUDED.shares_issued, book_value_per_share = EXCLUDED.book_value_per_share, roe = EXCLUDED.roe, net_margin = EXCLUDED.net_margin, reviewed_at = now(), updated_at = now();

INSERT INTO public.stock_shareholder_snapshots (stock_id, reported_as_of, holder_rank, holder_name, shares, ownership_percent, holding_value, source_url)
SELECT s.id, '2026-09-07'::date, v.holder_rank, v.holder_name, v.shares, v.ownership_percent, v.holding_value, 'https://kenyanstocks.com/stock/nse/ABSA?tab=Holders'
FROM public.stocks s CROSS JOIN (VALUES
  (1, 'Absa Group Limited', 3720000000::bigint, 68.50::numeric, 129670000000::numeric),
  (2, 'Standard Chartered Kenya Nominees Ltd A/C Ke004667', 110740000::bigint, 2.04::numeric, 3860000000::numeric),
  (3, 'Patel Baloobhai; Patel Amarjeet Baloobhai', 65030000::bigint, 1.20::numeric, 2270000000::numeric),
  (4, 'Kenya Commercial Bank Nominees Limited A/C 915b', 41860000::bigint, 0.77::numeric, 1460000000::numeric),
  (5, 'Standard Chartered Nominees Resd A/C Ke11450', 37860000::bigint, 0.70::numeric, 1320000000::numeric),
  (6, 'Standard Chartered Nominees Resd A/C Ke11401', 24940000::bigint, 0.46::numeric, 868990000::numeric),
  (7, 'Standard Chartered Nominees Resd A/C Ke11436', 23370000::bigint, 0.43::numeric, 814400000::numeric),
  (8, 'Standard Chartered Nominees Resd A/C Ke11443', 21950000::bigint, 0.40::numeric, 765040000::numeric),
  (9, 'KCB Nominees A/C 1065b', 16790000::bigint, 0.31::numeric, 585220000::numeric),
  (10, 'Stanbic Nominees R6631578', 14590000::bigint, 0.27::numeric, 508630000::numeric)
) AS v(holder_rank, holder_name, shares, ownership_percent, holding_value)
WHERE s.symbol = 'ABSA'
ON CONFLICT (stock_id, reported_as_of, holder_rank) DO UPDATE SET holder_name = EXCLUDED.holder_name, shares = EXCLUDED.shares, ownership_percent = EXCLUDED.ownership_percent, holding_value = EXCLUDED.holding_value, reviewed_at = now(), updated_at = now();

INSERT INTO public.stock_filing_metadata (stock_id, fiscal_year, filing_type, title, published_at, official_url, source_url)
SELECT s.id, v.fiscal_year, v.filing_type, v.title, v.published_at, NULL, 'https://kenyanstocks.com/stock/nse/ABSA?tab=Files'
FROM public.stocks s CROSS JOIN (VALUES
  (2025, 'financial_statement', 'ABSA Bank Kenya financial statements', '2026-03-05'::date),
  (2025, 'shareholding_structure', 'ABSA Bank Kenya shareholding structure', '2025-12-13'::date),
  (2025, 'financial_statement', 'ABSA Bank Kenya Q3 financial statements', '2025-12-12'::date),
  (2025, 'financial_statement', 'ABSA Bank Kenya Q2 unaudited financial statements', '2025-12-12'::date),
  (2025, 'financial_report', 'ABSA Bank Kenya Q1 financial report', '2025-12-12'::date),
  (2024, 'sustainability_report', 'ABSA Bank Kenya sustainability report', '2025-12-12'::date),
  (2024, 'integrated_report', 'ABSA Bank Kenya integrated report', '2025-12-12'::date)
) AS v(fiscal_year, filing_type, title, published_at)
WHERE s.symbol = 'ABSA'
ON CONFLICT (stock_id, fiscal_year, filing_type, title) DO UPDATE SET published_at = EXCLUDED.published_at, reviewed_at = now(), updated_at = now();

COMMIT;
