-- Fix 1: Recreate funds_public view with SECURITY INVOKER
-- This ensures the view respects the underlying RLS policies on funds table
DROP VIEW IF EXISTS public.funds_public;
CREATE VIEW public.funds_public
WITH (security_invoker = on)
AS
SELECT 
    id,
    slug,
    name,
    manager,
    description,
    website,
    fund_type,
    yield_unit,
    annual_yield,
    seven_day_yield,
    thirty_day_yield,
    daily_yield,
    minimum_investment,
    management_fee,
    withdrawal_time,
    cma_licensed,
    is_published,
    fact_sheet_date,
    source_url,
    created_at,
    updated_at
FROM funds
WHERE is_published = true;

-- Fix 2: Revoke public EXECUTE on has_role to prevent user enumeration
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
-- Keep authenticated access for RLS evaluation
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;