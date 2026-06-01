
CREATE OR REPLACE VIEW public.funds_public AS
SELECT id, annual_yield, seven_day_yield, thirty_day_yield, daily_yield,
       minimum_investment, management_fee, cma_licensed, fact_sheet_date,
       is_published, created_at, updated_at, name, slug, manager, fund_type,
       description, yield_unit, withdrawal_time, website, logo_url
FROM public.funds
WHERE is_published = true;
