
ALTER TABLE public.price_alerts DROP CONSTRAINT IF EXISTS price_alerts_asset_type_check;
ALTER TABLE public.price_alerts ADD CONSTRAINT price_alerts_asset_type_check
  CHECK (asset_type IN ('stock','currency','commodity','fund','new_fund'));

ALTER TABLE public.price_alerts DROP CONSTRAINT IF EXISTS price_alerts_condition_check;
ALTER TABLE public.price_alerts ADD CONSTRAINT price_alerts_condition_check
  CHECK (condition IN ('above','below','change_up','change_down','change_any'));

ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS baseline_price numeric;
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true;
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS notify_inapp boolean NOT NULL DEFAULT true;
