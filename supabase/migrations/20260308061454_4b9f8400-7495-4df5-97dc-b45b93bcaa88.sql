
-- Fix 1: Remove unrestricted INSERT on auth_gate_clicks
-- All inserts now go through the track-anonymous edge function which has rate limiting and validation
DROP POLICY IF EXISTS "Authenticated users can insert auth gate clicks" ON public.auth_gate_clicks;

-- Fix 2: Create a public view for funds that excludes admin UUIDs
CREATE OR REPLACE VIEW public.funds_public AS
SELECT id, slug, name, manager, description, website, fund_type, yield_unit,
       annual_yield, seven_day_yield, thirty_day_yield, daily_yield,
       minimum_investment, management_fee, withdrawal_time,
       cma_licensed, is_published, fact_sheet_date, source_url,
       created_at, updated_at
FROM public.funds
WHERE is_published = true;

GRANT SELECT ON public.funds_public TO anon, authenticated;
