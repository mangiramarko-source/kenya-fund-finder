CREATE TABLE IF NOT EXISTS public.portfolio_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_holding_id uuid NULL,
  asset_id uuid NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('mmf','stock','fx','fixed_income','commodity')),
  asset_name text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('add','update','remove')),
  amount numeric NULL,
  quantity numeric NULL,
  event_date timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_events TO authenticated;
GRANT ALL ON public.portfolio_events TO service_role;

ALTER TABLE public.portfolio_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolio events"
ON public.portfolio_events
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS portfolio_events_user_idx ON public.portfolio_events(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS portfolio_events_holding_idx ON public.portfolio_events(portfolio_holding_id);