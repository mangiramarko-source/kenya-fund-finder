
ALTER TABLE public.funds
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS good_for text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS not_good_for text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS inception_date date NULL,
  ADD COLUMN IF NOT EXISTS aum_kes numeric NULL,
  ADD COLUMN IF NOT EXISTS manager_years_active integer NULL,
  ADD COLUMN IF NOT EXISTS exit_fee numeric NULL,
  ADD COLUMN IF NOT EXISTS withdrawal_days integer NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'funds_risk_level_check') THEN
    ALTER TABLE public.funds ADD CONSTRAINT funds_risk_level_check CHECK (risk_level IN ('low','medium','high'));
  END IF;
END$$;

UPDATE public.funds SET risk_level = 'low' WHERE fund_type IN ('money_market','fixed_income','bond');
UPDATE public.funds SET risk_level = 'medium' WHERE fund_type = 'balanced';
UPDATE public.funds SET risk_level = 'high' WHERE fund_type = 'equity';

UPDATE public.funds
SET withdrawal_days = COALESCE(NULLIF((regexp_match(withdrawal_time, '(\d+)'))[1], '')::integer, 3)
WHERE withdrawal_days IS NULL;
