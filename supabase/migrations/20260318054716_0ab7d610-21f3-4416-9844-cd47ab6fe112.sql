
-- Create stocks table
CREATE TABLE public.stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  name text NOT NULL,
  sector text NOT NULL DEFAULT 'Other',
  price numeric NOT NULL DEFAULT 0,
  previous_price numeric DEFAULT NULL,
  day_change numeric NOT NULL DEFAULT 0,
  day_change_percent numeric NOT NULL DEFAULT 0,
  volume bigint NOT NULL DEFAULT 0,
  market_cap numeric DEFAULT NULL,
  year_high numeric DEFAULT NULL,
  year_low numeric DEFAULT NULL,
  pe_ratio numeric DEFAULT NULL,
  dividend_yield numeric DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid DEFAULT NULL,
  UNIQUE(symbol)
);

-- Enable RLS
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage stocks" ON public.stocks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Column-level security for anon: grant only non-sensitive columns
REVOKE ALL ON public.stocks FROM anon;
GRANT SELECT (id, symbol, name, sector, price, previous_price, day_change, day_change_percent, volume, market_cap, year_high, year_low, pe_ratio, dividend_yield, is_active, sort_order, updated_at, created_at) ON public.stocks TO anon;

-- Anon can read active stocks
CREATE POLICY "Anon can read active stocks" ON public.stocks
  FOR SELECT TO anon
  USING (is_active = true);

-- Authenticated non-admin can read active stocks
CREATE POLICY "Auth can read active stocks" ON public.stocks
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Create public view (no created_by/updated_by)
CREATE OR REPLACE VIEW public.stocks_public
WITH (security_invoker = on) AS
SELECT id, symbol, name, sector, price, previous_price, day_change, day_change_percent,
       volume, market_cap, year_high, year_low, pe_ratio, dividend_yield,
       is_active, sort_order, updated_at
FROM public.stocks
WHERE is_active = true;

-- Grant SELECT on public view
GRANT SELECT ON public.stocks_public TO anon, authenticated;

-- Updated_at trigger
CREATE TRIGGER update_stocks_updated_at
  BEFORE UPDATE ON public.stocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
