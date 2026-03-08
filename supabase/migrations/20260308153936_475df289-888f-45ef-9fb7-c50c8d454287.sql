
-- Exchange rates table (currencies vs KES)
CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL,
  currency_name text NOT NULL,
  rate numeric NOT NULL,
  previous_rate numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_exchange_rates_currency ON public.exchange_rates(currency_code);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rates"
ON public.exchange_rates FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Admins can manage rates"
ON public.exchange_rates FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Commodities table (gold, silver, oil, etc.)
CREATE TABLE public.commodities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  symbol text NOT NULL,
  price numeric NOT NULL,
  previous_price numeric,
  unit text NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_commodities_symbol ON public.commodities(symbol);

ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active commodities"
ON public.commodities FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Admins can manage commodities"
ON public.commodities FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
