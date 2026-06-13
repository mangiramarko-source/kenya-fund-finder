ALTER TABLE public.mock_portfolios ADD COLUMN IF NOT EXISTS asset_id uuid NULL;
CREATE INDEX IF NOT EXISTS mock_portfolios_asset_id_idx ON public.mock_portfolios(asset_id);