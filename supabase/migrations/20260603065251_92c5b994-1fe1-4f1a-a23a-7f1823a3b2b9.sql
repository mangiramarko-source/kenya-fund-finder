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