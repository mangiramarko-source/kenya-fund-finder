BEGIN;

SET LOCAL lock_timeout = '5s';

-- Optional contact details are published only after editorial verification.
ALTER TABLE public.stock_company_profiles
  ADD COLUMN IF NOT EXISTS headquarters text,
  ADD COLUMN IF NOT EXISTS telephone text;

COMMENT ON COLUMN public.stock_company_profiles.headquarters IS
  'Reviewed head-office location. Null when no confidently verified location is available.';
COMMENT ON COLUMN public.stock_company_profiles.telephone IS
  'Reviewed public company telephone number. Null when no confidently verified number is available.';

-- Keep the internal KenyanStocks research reference private while making the reviewed
-- display fields available to the security-invoker public stock view.
REVOKE ALL ON public.stock_company_profiles FROM anon, authenticated;
GRANT SELECT (stock_id, summary, official_website, headquarters, telephone, is_published)
  ON public.stock_company_profiles TO anon, authenticated;

CREATE OR REPLACE VIEW public.stocks_public WITH (security_invoker = true) AS
SELECT s.id, s.symbol, s.name, s.sector, s.price, s.previous_price, s.day_change,
       s.day_change_percent, s.volume, s.market_cap, s.year_high, s.year_low, s.pe_ratio,
       s.dividend_yield, s.is_active, s.sort_order, s.updated_at,
       s.provider_updated_at, s.quote_source, s.logo_url,
       p.summary AS company_summary, p.official_website, p.headquarters, p.telephone
FROM public.stocks s
LEFT JOIN public.stock_company_profiles p
  ON p.stock_id = s.id AND p.is_published = true
WHERE s.is_active = true;

GRANT SELECT ON public.stocks_public TO anon, authenticated;

UPDATE public.stock_company_profiles p
SET headquarters = 'Nairobi, Kenya',
    telephone = '+254 703 083 000',
    reviewed_at = now(),
    updated_at = now()
FROM public.stocks s
WHERE p.stock_id = s.id
  AND s.symbol = 'ABSA';

COMMIT;
