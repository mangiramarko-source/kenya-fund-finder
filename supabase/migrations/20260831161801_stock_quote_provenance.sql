BEGIN;
SET LOCAL lock_timeout = '5s';

-- Nullable by design: historical rows must not receive invented provenance.
-- updated_at remains the database write time (also changed by other edits).
ALTER TABLE public.stocks
  ADD COLUMN provider_updated_at timestamptz,
  ADD COLUMN quote_source text,
  ADD CONSTRAINT stocks_quote_source_check
    CHECK (quote_source IN ('rapidapi', 'nse'));

COMMENT ON COLUMN public.stocks.provider_updated_at IS
  'Provider/cache update time, currently RapidAPI meta.lastUpdated. Not a confirmed NSE trade timestamp. NULL when unavailable.';
COMMENT ON COLUMN public.stocks.quote_source IS
  'Origin of the stored quote: rapidapi or nse. Cache reuse preserves this value and provider_updated_at. NULL for unknown legacy provenance.';

-- Keep column order, active-row filtering, security-invoker behavior and ACLs.
CREATE OR REPLACE VIEW public.stocks_public WITH (security_invoker = true) AS
SELECT id, symbol, name, sector, price, previous_price, day_change,
       day_change_percent, volume, market_cap, year_high, year_low, pe_ratio,
       dividend_yield, is_active, sort_order, updated_at,
       provider_updated_at, quote_source
FROM public.stocks
WHERE is_active = true;

COMMIT;
