BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.stocks.logo_url IS
  'Public URL for a reviewed, official stock issuer logo hosted in market-logos storage. NULL falls back to issuer initials.';

CREATE OR REPLACE VIEW public.stocks_public WITH (security_invoker = true) AS
SELECT id, symbol, name, sector, price, previous_price, day_change,
       day_change_percent, volume, market_cap, year_high, year_low, pe_ratio,
       dividend_yield, is_active, sort_order, updated_at,
       provider_updated_at, quote_source, logo_url
FROM public.stocks
WHERE is_active = true;

GRANT SELECT (logo_url) ON public.stocks TO anon, authenticated;
GRANT SELECT ON public.stocks_public TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'market-logos',
  'market-logos',
  true,
  1048576,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Market logos public read" ON storage.objects;
CREATE POLICY "Market logos public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'market-logos');

DROP POLICY IF EXISTS "Admins upload market logos" ON storage.objects;
CREATE POLICY "Admins upload market logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'market-logos' AND public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins update market logos" ON storage.objects;
CREATE POLICY "Admins update market logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'market-logos' AND public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (bucket_id = 'market-logos' AND public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins delete market logos" ON storage.objects;
CREATE POLICY "Admins delete market logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'market-logos' AND public.has_role((select auth.uid()), 'admin'));

COMMIT;
