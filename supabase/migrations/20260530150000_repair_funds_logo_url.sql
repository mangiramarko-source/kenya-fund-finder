-- Repair migration: logo_url and funds_public view were defined in
-- 20260601065750, 20260601065830, 20260601065841, and 20260603065251 but may
-- be missing on caawgzuofnujrznwbuxk if the project schema was partially applied.
-- Idempotent — safe to re-run.

-- ===== funds.logo_url column =====
ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS logo_url text;

-- ===== fund-logos storage bucket =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('fund-logos', 'fund-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Fund logos public read" ON storage.objects;
CREATE POLICY "Fund logos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fund-logos');

DROP POLICY IF EXISTS "Admins upload fund logos" ON storage.objects;
CREATE POLICY "Admins upload fund logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fund-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update fund logos" ON storage.objects;
CREATE POLICY "Admins update fund logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fund-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete fund logos" ON storage.objects;
CREATE POLICY "Admins delete fund logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'fund-logos' AND public.has_role(auth.uid(), 'admin'));

-- ===== funds_public view (preserve column order, append logo_url) =====
DROP VIEW IF EXISTS public.funds_public CASCADE;

CREATE VIEW public.funds_public
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  slug,
  manager,
  fund_type,
  description,
  annual_yield,
  seven_day_yield,
  thirty_day_yield,
  daily_yield,
  yield_unit,
  minimum_investment,
  management_fee,
  withdrawal_time,
  website,
  cma_licensed,
  fact_sheet_date,
  is_published,
  created_at,
  updated_at,
  logo_url
FROM public.funds
WHERE is_published = true;

-- ===== column grants =====
GRANT SELECT (
  id,
  annual_yield,
  seven_day_yield,
  thirty_day_yield,
  daily_yield,
  minimum_investment,
  management_fee,
  cma_licensed,
  fact_sheet_date,
  is_published,
  created_at,
  updated_at,
  name,
  slug,
  manager,
  fund_type,
  description,
  yield_unit,
  withdrawal_time,
  website,
  logo_url
) ON public.funds TO anon, authenticated;

GRANT SELECT ON public.funds_public TO anon, authenticated;
GRANT ALL ON public.funds TO service_role;
GRANT ALL ON public.funds_public TO service_role;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
