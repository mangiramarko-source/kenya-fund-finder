
CREATE TABLE public.mock_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (asset_type IN ('mmf', 'stock', 'fx', 'fixed_income', 'commodity')),
  asset_name text NOT NULL,
  ticker text,
  units numeric NOT NULL DEFAULT 1,
  buy_price numeric NOT NULL,
  current_price numeric NOT NULL,
  current_yield numeric DEFAULT 0,
  buy_date timestamp with time zone NOT NULL DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolio" ON public.mock_portfolios
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
