
-- Table to store daily yield snapshots
CREATE TABLE public.fund_yield_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  annual_yield numeric NOT NULL,
  daily_yield numeric NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.fund_yield_snapshots ENABLE ROW LEVEL SECURITY;

-- Anyone can view snapshots (public data)
CREATE POLICY "Anyone can view yield snapshots"
ON public.fund_yield_snapshots FOR SELECT
USING (true);

-- Admins can manage snapshots
CREATE POLICY "Admins can manage yield snapshots"
ON public.fund_yield_snapshots FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_yield_snapshots_fund_date ON public.fund_yield_snapshots (fund_id, snapshot_date DESC);

-- Trigger: automatically snapshot old values when funds are updated
CREATE OR REPLACE FUNCTION public.snapshot_yield_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only snapshot if yields actually changed
  IF OLD.annual_yield IS DISTINCT FROM NEW.annual_yield 
     OR OLD.daily_yield IS DISTINCT FROM NEW.daily_yield THEN
    INSERT INTO public.fund_yield_snapshots (fund_id, annual_yield, daily_yield, snapshot_date)
    VALUES (OLD.id, OLD.annual_yield, OLD.daily_yield, CURRENT_DATE)
    ON CONFLICT (fund_id, snapshot_date) DO UPDATE
    SET annual_yield = EXCLUDED.annual_yield, daily_yield = EXCLUDED.daily_yield;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_snapshot_yield
BEFORE UPDATE ON public.funds
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_yield_on_update();
