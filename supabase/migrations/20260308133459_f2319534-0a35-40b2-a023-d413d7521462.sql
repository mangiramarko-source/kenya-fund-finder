-- 1. Drop the overly broad "Anyone can read profiles" policy
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

-- 2. Drop and recreate funds_public view without source_url
DROP VIEW IF EXISTS public.funds_public;
CREATE VIEW public.funds_public WITH (security_invoker = on) AS
SELECT
  id, slug, name, manager, cma_licensed,
  annual_yield, seven_day_yield, thirty_day_yield, daily_yield,
  minimum_investment, management_fee, fund_type, yield_unit,
  description, website, withdrawal_time, fact_sheet_date,
  is_published, created_at, updated_at
FROM public.funds;