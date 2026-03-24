
DROP TRIGGER IF EXISTS trg_snapshot_rate ON public.exchange_rates;
CREATE TRIGGER trg_snapshot_rate
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_rate_on_update();
