BEGIN;
SET LOCAL lock_timeout = '5s';

-- 1. Add East African multi-exchange and currency columns to public.stocks
ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS exchange text NOT NULL DEFAULT 'NSE',
  ADD COLUMN IF NOT EXISTS exchange_ticker text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'KE';

-- Backfill exchange_ticker for existing Kenyan NSE listings
UPDATE public.stocks
SET exchange_ticker = symbol
WHERE exchange_ticker IS NULL;

ALTER TABLE public.stocks
  ALTER COLUMN exchange_ticker SET NOT NULL;

-- 2. Add/update constraints for exchanges, currencies, symbols, and quote provenance
ALTER TABLE public.stocks
  DROP CONSTRAINT IF EXISTS stocks_exchange_check,
  ADD CONSTRAINT stocks_exchange_check
    CHECK (exchange IN ('NSE', 'USE', 'DSE', 'RSE')),
  DROP CONSTRAINT IF EXISTS stocks_currency_check,
  ADD CONSTRAINT stocks_currency_check
    CHECK (currency IN ('KES', 'UGX', 'TZS', 'RWF')),
  DROP CONSTRAINT IF EXISTS stocks_country_code_check,
  ADD CONSTRAINT stocks_country_code_check
    CHECK (country_code IN ('KE', 'UG', 'TZ', 'RW')),
  DROP CONSTRAINT IF EXISTS stocks_symbol_format_check,
  ADD CONSTRAINT stocks_symbol_format_check
    CHECK (symbol ~ '^[A-Za-z0-9_-]{1,32}$'),
  DROP CONSTRAINT IF EXISTS stocks_quote_source_check,
  ADD CONSTRAINT stocks_quote_source_check
    CHECK (quote_source IN ('rapidapi', 'nse', 'mansa'));

-- Unique per-exchange local ticker alongside global UNIQUE(symbol)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stocks_exchange_ticker_key'
      AND conrelid = 'public.stocks'::regclass
  ) THEN
    ALTER TABLE public.stocks
      ADD CONSTRAINT stocks_exchange_ticker_key UNIQUE (exchange, exchange_ticker);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_stocks_exchange_active_sort
  ON public.stocks (exchange, is_active, sort_order);

COMMENT ON COLUMN public.stocks.exchange IS
  'Securities exchange code: NSE (Kenya), USE (Uganda), DSE (Tanzania), or RSE (Rwanda).';
COMMENT ON COLUMN public.stocks.exchange_ticker IS
  'Raw exchange-local ticker (e.g. MTNU, CRDB, BOK, AIRTEL_UGANDA, KCB), while symbol is globally unique (bare for NSE, {EXCHANGE}-{TICKER} for USE/DSE/RSE).';
COMMENT ON COLUMN public.stocks.currency IS
  'Trading currency ISO 4217 code: KES, UGX, TZS, or RWF.';
COMMENT ON COLUMN public.stocks.country_code IS
  'ISO 3166-1 alpha-2 country code: KE, UG, TZ, or RW.';
COMMENT ON COLUMN public.stocks.quote_source IS
  'Origin of the stored quote: rapidapi, nse, or mansa. Cache reuse preserves this value and provider_updated_at.';

-- 3. Grant column-level SELECT on the new columns for anon and authenticated
GRANT SELECT (exchange, exchange_ticker, currency, country_code)
  ON public.stocks TO anon, authenticated;

-- 4. Update public.stocks_public view (preserving existing column order and appending new columns)
CREATE OR REPLACE VIEW public.stocks_public WITH (security_invoker = true) AS
SELECT s.id, s.symbol, s.name, s.sector, s.price, s.previous_price, s.day_change,
       s.day_change_percent, s.volume, s.market_cap, s.year_high, s.year_low, s.pe_ratio,
       s.dividend_yield, s.is_active, s.sort_order, s.updated_at,
       s.provider_updated_at, s.quote_source, s.logo_url,
       p.summary AS company_summary, p.official_website, p.headquarters, p.telephone,
       s.day_low, s.day_high,
       s.exchange, s.exchange_ticker, s.currency, s.country_code
FROM public.stocks s
LEFT JOIN public.stock_company_profiles p
  ON p.stock_id = s.id AND p.is_published = true
WHERE s.is_active = true;

GRANT SELECT ON public.stocks_public TO anon, authenticated;

COMMIT;
