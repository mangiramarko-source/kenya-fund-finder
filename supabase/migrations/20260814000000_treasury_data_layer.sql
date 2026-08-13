-- 20260814000000_treasury_data_layer.sql

-- 1. macro_rates
CREATE TABLE IF NOT EXISTS public.macro_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric TEXT NOT NULL,
    value NUMERIC NOT NULL,
    observation_date DATE NOT NULL,
    source TEXT NOT NULL,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. treasury_bill_auctions
CREATE TABLE IF NOT EXISTS public.treasury_bill_auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenor_days INTEGER NOT NULL CHECK (tenor_days IN (91, 182, 364)),
    issue_number TEXT NOT NULL,
    auction_date DATE NOT NULL,
    issue_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    amount_offered NUMERIC,
    bids_received NUMERIC,
    amount_accepted NUMERIC,
    number_bids_received INTEGER,
    number_bids_accepted INTEGER,
    competitive_bids NUMERIC,
    non_competitive_bids NUMERIC,
    market_average_rate NUMERIC,
    accepted_average_rate NUMERIC,
    previous_rate NUMERIC,
    rate_change NUMERIC,
    performance_rate NUMERIC,
    bid_to_cover NUMERIC,
    price_per_100 NUMERIC,
    source_url TEXT,
    source_document TEXT,
    published_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(issue_number, tenor_days)
);

-- 3. treasury_bonds
CREATE TABLE IF NOT EXISTS public.treasury_bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bond_code TEXT NOT NULL UNIQUE,
    isin TEXT,
    bond_type TEXT NOT NULL,
    issue_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    original_tenor_years NUMERIC,
    coupon_rate NUMERIC,
    tax_status TEXT,
    interest_payment_frequency TEXT,
    status TEXT NOT NULL,
    source_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. treasury_bond_auctions
CREATE TABLE IF NOT EXISTS public.treasury_bond_auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bond_id UUID NOT NULL REFERENCES public.treasury_bonds(id) ON DELETE CASCADE,
    auction_date DATE NOT NULL,
    auction_type TEXT,
    amount_offered NUMERIC,
    bids_received NUMERIC,
    amount_accepted NUMERIC,
    average_rate NUMERIC,
    cutoff_rate NUMERIC,
    average_price NUMERIC,
    settlement_date DATE,
    source_url TEXT,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. treasury_upcoming_auctions
CREATE TABLE IF NOT EXISTS public.treasury_upcoming_auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_type TEXT NOT NULL CHECK (security_type IN ('T-Bill', 'Bond')),
    security TEXT NOT NULL,
    issue_number TEXT,
    auction_date DATE NOT NULL,
    closing_date DATE,
    results_date DATE,
    settlement_date DATE,
    amount_offered NUMERIC,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.macro_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_bill_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_bond_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_upcoming_auctions ENABLE ROW LEVEL SECURITY;

-- Read policies for public access
CREATE POLICY "Allow public read access on macro_rates" ON public.macro_rates FOR SELECT USING (true);
CREATE POLICY "Allow public read access on treasury_bill_auctions" ON public.treasury_bill_auctions FOR SELECT USING (true);
CREATE POLICY "Allow public read access on treasury_bonds" ON public.treasury_bonds FOR SELECT USING (true);
CREATE POLICY "Allow public read access on treasury_bond_auctions" ON public.treasury_bond_auctions FOR SELECT USING (true);
CREATE POLICY "Allow public read access on treasury_upcoming_auctions" ON public.treasury_upcoming_auctions FOR SELECT USING (true);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_tbill_auctions_date ON public.treasury_bill_auctions(auction_date DESC);
CREATE INDEX IF NOT EXISTS idx_tbill_auctions_tenor ON public.treasury_bill_auctions(tenor_days);
CREATE INDEX IF NOT EXISTS idx_bonds_maturity ON public.treasury_bonds(maturity_date);
CREATE INDEX IF NOT EXISTS idx_bonds_status ON public.treasury_bonds(status);
CREATE INDEX IF NOT EXISTS idx_bond_auctions_date ON public.treasury_bond_auctions(auction_date DESC);
CREATE INDEX IF NOT EXISTS idx_macro_rates_metric ON public.macro_rates(metric);
CREATE INDEX IF NOT EXISTS idx_upcoming_auctions_date ON public.treasury_upcoming_auctions(auction_date);
