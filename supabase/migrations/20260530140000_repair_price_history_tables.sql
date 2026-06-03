-- Repair migration: stock_price_history and commodity_price_history were defined in
-- 20260325210318 and 20260402045742 but may be missing on caawgzuofnujrznwbuxk if
-- the project schema was partially applied. Idempotent — safe to re-run.

-- ===== stock_price_history =====
CREATE TABLE IF NOT EXISTS public.stock_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stock_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_stock_price_history_stock_date
  ON public.stock_price_history (stock_id, snapshot_date DESC);

ALTER TABLE public.stock_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view stock price history" ON public.stock_price_history;
CREATE POLICY "Anyone can view stock price history"
  ON public.stock_price_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage stock price history" ON public.stock_price_history;
CREATE POLICY "Admins can manage stock price history"
  ON public.stock_price_history
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.snapshot_stock_price_on_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO public.stock_price_history (stock_id, price, snapshot_date)
    VALUES (OLD.id, OLD.price, CURRENT_DATE)
    ON CONFLICT (stock_id, snapshot_date) DO UPDATE
    SET price = EXCLUDED.price;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_stock_price ON public.stocks;
CREATE TRIGGER trg_snapshot_stock_price
  BEFORE UPDATE ON public.stocks
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_stock_price_on_update();

CREATE OR REPLACE VIEW public.stock_price_history_public
  WITH (security_invoker = on)
AS
  SELECT sph.id, sph.stock_id, sph.price, sph.snapshot_date, s.symbol
  FROM public.stock_price_history sph
  JOIN public.stocks s ON s.id = sph.stock_id
  WHERE s.is_active = true;

GRANT SELECT ON public.stock_price_history_public TO anon, authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_price_history;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ===== commodity_price_history =====
CREATE TABLE IF NOT EXISTS public.commodity_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id UUID NOT NULL REFERENCES public.commodities(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (commodity_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_commodity_price_history_commodity_date
  ON public.commodity_price_history (commodity_id, snapshot_date DESC);

ALTER TABLE public.commodity_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage commodity price history" ON public.commodity_price_history;
CREATE POLICY "Admins can manage commodity price history"
  ON public.commodity_price_history
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view commodity price history" ON public.commodity_price_history;
CREATE POLICY "Anyone can view commodity price history"
  ON public.commodity_price_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE VIEW public.commodity_price_history_public
  WITH (security_invoker = on)
AS
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

DROP TRIGGER IF EXISTS snapshot_commodity_price ON public.commodities;
CREATE TRIGGER snapshot_commodity_price
  BEFORE UPDATE ON public.commodities
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_commodity_price_on_update();
