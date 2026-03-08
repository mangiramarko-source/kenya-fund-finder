
-- Create exchange rate history table for tracking rate trends
CREATE TABLE public.exchange_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_rate_id uuid NOT NULL REFERENCES public.exchange_rates(id) ON DELETE CASCADE,
  rate numeric NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exchange_rate_id, snapshot_date)
);

ALTER TABLE public.exchange_rate_history ENABLE ROW LEVEL SECURITY;

-- Public can read via view, admins can manage
CREATE POLICY "Admins can manage rate history"
  ON public.exchange_rate_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create public view hiding internal IDs
CREATE VIEW public.exchange_rate_history_public
WITH (security_invoker=on) AS
  SELECT h.id, h.exchange_rate_id, r.currency_code, h.rate, h.snapshot_date
  FROM public.exchange_rate_history h
  JOIN public.exchange_rates r ON r.id = h.exchange_rate_id
  WHERE r.is_active = true;

-- Anon SELECT on base table for view to work
CREATE POLICY "Anon can read rate history"
  ON public.exchange_rate_history FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can read rate history"
  ON public.exchange_rate_history FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.exchange_rate_history_public TO anon, authenticated;

-- Auto-snapshot trigger when rates change
CREATE OR REPLACE FUNCTION public.snapshot_rate_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.rate IS DISTINCT FROM NEW.rate THEN
    INSERT INTO public.exchange_rate_history (exchange_rate_id, rate, snapshot_date)
    VALUES (OLD.id, OLD.rate, CURRENT_DATE)
    ON CONFLICT (exchange_rate_id, snapshot_date) DO UPDATE
    SET rate = EXCLUDED.rate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_rate
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_rate_on_update();

-- Seed history with current rates so chart has initial data
INSERT INTO public.exchange_rate_history (exchange_rate_id, rate, snapshot_date)
SELECT id, rate, CURRENT_DATE FROM public.exchange_rates WHERE is_active = true
ON CONFLICT DO NOTHING;
