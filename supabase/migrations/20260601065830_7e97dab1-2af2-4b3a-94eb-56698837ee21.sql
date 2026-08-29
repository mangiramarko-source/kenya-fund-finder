
-- CREATE OR REPLACE VIEW matches columns by position. Keep the canonical order
-- established by the preceding repair migration so fresh migration replay does
-- not attempt to rename existing view columns.
CREATE OR REPLACE VIEW public.funds_public
WITH (security_invoker = true) AS
SELECT id, name, slug, manager, fund_type, description,
       annual_yield, seven_day_yield, thirty_day_yield, daily_yield, yield_unit,
       minimum_investment, management_fee, withdrawal_time, website,
       cma_licensed, fact_sheet_date, is_published, created_at, updated_at,
       logo_url
FROM public.funds
WHERE is_published = true;

GRANT SELECT ON public.funds_public TO anon, authenticated;
GRANT ALL ON public.funds_public TO service_role;
