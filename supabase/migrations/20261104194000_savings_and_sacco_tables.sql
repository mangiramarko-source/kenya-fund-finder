-- Migration: Create Bank Fixed Deposits and SACCO comparison tables
-- Timestamp: 20261104194000

CREATE TABLE IF NOT EXISTS public.bank_fixed_deposits (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  bank_code TEXT,
  bank_tier INT NOT NULL CHECK (bank_tier IN (1, 2, 3)),
  currency TEXT NOT NULL CHECK (currency IN ('KES', 'USD')),
  tenor_months INT NOT NULL CHECK (tenor_months IN (1, 3, 6, 12)),
  gross_yield_pct NUMERIC(5,2) NOT NULL,
  net_yield_pct NUMERIC(5,2) NOT NULL,
  min_deposit NUMERIC(12,2) NOT NULL DEFAULT 50000,
  payout_frequency TEXT NOT NULL DEFAULT 'maturity',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  website_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sacco_records (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  sasra_license TEXT NOT NULL DEFAULT 'DT-SACCO',
  dividend_on_shares_pct NUMERIC(5,2) NOT NULL,
  interest_on_deposits_pct NUMERIC(5,2) NOT NULL,
  net_interest_pct NUMERIC(5,2) NOT NULL,
  min_monthly_contribution NUMERIC(10,2) NOT NULL DEFAULT 1000,
  min_share_capital NUMERIC(10,2) NOT NULL DEFAULT 20000,
  open_to_public BOOLEAN NOT NULL DEFAULT true,
  membership_category TEXT,
  total_assets_kes_billions NUMERIC(8,2),
  reporting_year INT NOT NULL DEFAULT 2025,
  headquarters TEXT,
  website_url TEXT,
  notes TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_bfd_currency_tenor ON public.bank_fixed_deposits(currency, tenor_months);
CREATE INDEX IF NOT EXISTS idx_bfd_gross_yield ON public.bank_fixed_deposits(gross_yield_pct DESC);
CREATE INDEX IF NOT EXISTS idx_sacco_interest ON public.sacco_records(interest_on_deposits_pct DESC);

-- Enable RLS
ALTER TABLE public.bank_fixed_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sacco_records ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all visitors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bank_fixed_deposits' AND policyname = 'Public read access for bank fixed deposits'
  ) THEN
    CREATE POLICY "Public read access for bank fixed deposits"
      ON public.bank_fixed_deposits FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sacco_records' AND policyname = 'Public read access for sacco records'
  ) THEN
    CREATE POLICY "Public read access for sacco records"
      ON public.sacco_records FOR SELECT
      USING (true);
  END IF;
END $$;
