
CREATE TABLE public.commodity_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id uuid NOT NULL REFERENCES public.commodities(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commodity_id, snapshot_date)
);

ALTER TABLE public.commodity_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commodity price history"
ON public.commodity_price_history FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view commodity price history"
ON public.commodity_price_history FOR SELECT TO anon, authenticated
USING (true);

CREATE OR REPLACE VIEW public.commodity_price_history_public AS
SELECT cph.id, cph.commodity_id, cph.price, cph.snapshot_date, c.symbol
FROM public.commodity_price_history cph
JOIN public.commodities c ON c.id = cph.commodity_id
WHERE c.is_active = true;

GRANT SELECT ON public.commodity_price_history_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.snapshot_commodity_price_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO public.commodity_price_history (commodity_id, price, snapshot_date)
    VALUES (OLD.id, OLD.price, CURRENT_DATE)
    ON CONFLICT (commodity_id, snapshot_date) DO UPDATE
    SET price = EXCLUDED.price;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER snapshot_commodity_price
BEFORE UPDATE ON public.commodities
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_commodity_price_on_update();
