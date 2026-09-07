BEGIN;
SET LOCAL lock_timeout = '5s';

-- Imported quote fields are nullable: a range is only shown when the upstream
-- quote source supplies both values, never synthesized from the close.
ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS day_low numeric,
  ADD COLUMN IF NOT EXISTS day_high numeric,
  ADD CONSTRAINT stocks_day_range_order CHECK (day_low IS NULL OR day_high IS NULL OR day_low <= day_high);

CREATE OR REPLACE VIEW public.stocks_public WITH (security_invoker = true) AS
SELECT s.id, s.symbol, s.name, s.sector, s.price, s.previous_price, s.day_change,
       s.day_change_percent, s.volume, s.market_cap, s.year_high, s.year_low, s.pe_ratio,
       s.dividend_yield, s.is_active, s.sort_order, s.updated_at,
       s.provider_updated_at, s.quote_source, s.logo_url,
       p.summary AS company_summary, p.official_website, p.headquarters, p.telephone,
       s.day_low, s.day_high
FROM public.stocks s
LEFT JOIN public.stock_company_profiles p
  ON p.stock_id = s.id AND p.is_published = true
WHERE s.is_active = true;

GRANT SELECT ON public.stocks_public TO anon, authenticated;

-- Reviewed ABSA trading-session range. Daily importers may safely replace it
-- as newer source data becomes available.
UPDATE public.stocks
SET day_low = 34.75,
    day_high = 35.00,
    updated_at = now()
WHERE symbol = 'ABSA';

COMMIT;
