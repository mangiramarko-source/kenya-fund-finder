
-- Stock price history table for sparklines and trend tracking
CREATE TABLE public.stock_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (stock_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.stock_price_history ENABLE ROW LEVEL SECURITY;

-- Public read access for sparklines
CREATE POLICY "Anyone can view stock price history"
  ON public.stock_price_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage stock price history"
  ON public.stock_price_history
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-snapshot on stock price update
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

CREATE TRIGGER trg_snapshot_stock_price
  BEFORE UPDATE ON public.stocks
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_stock_price_on_update();

-- Create public view for stock price history
CREATE VIEW public.stock_price_history_public
  WITH (security_invoker = on)
AS
  SELECT sph.id, sph.stock_id, sph.price, sph.snapshot_date, s.symbol
  FROM public.stock_price_history sph
  JOIN public.stocks s ON s.id = sph.stock_id
  WHERE s.is_active = true;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_price_history;
