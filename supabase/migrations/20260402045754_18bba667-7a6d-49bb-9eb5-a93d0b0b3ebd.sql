
CREATE OR REPLACE VIEW public.commodity_price_history_public
WITH (security_invoker = true) AS
SELECT cph.id, cph.commodity_id, cph.price, cph.snapshot_date, c.symbol
FROM public.commodity_price_history cph
JOIN public.commodities c ON c.id = cph.commodity_id
WHERE c.is_active = true;
