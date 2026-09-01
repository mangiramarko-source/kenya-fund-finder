-- One representative closing price per active stock/month for compact long-range trends.
-- The latest stored observation in each month is selected; no values are synthesized.
CREATE OR REPLACE VIEW public.stock_price_history_monthly_public
  WITH (security_invoker = on)
AS
  SELECT DISTINCT ON (
    sph.stock_id,
    date_trunc('month', sph.snapshot_date)
  )
    sph.stock_id,
    sph.snapshot_date,
    sph.price
  FROM public.stock_price_history sph
  JOIN public.stocks s ON s.id = sph.stock_id
  WHERE s.is_active = true
    AND sph.price > 0
  ORDER BY
    sph.stock_id,
    date_trunc('month', sph.snapshot_date),
    sph.snapshot_date DESC,
    sph.created_at DESC;

GRANT SELECT ON public.stock_price_history_monthly_public TO anon, authenticated;
