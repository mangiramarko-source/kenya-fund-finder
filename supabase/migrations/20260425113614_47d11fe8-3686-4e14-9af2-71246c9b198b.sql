-- 1) Reduce default TTL on new unsubscribe tokens from 7 days to 48 hours
ALTER TABLE public.email_unsubscribe_tokens
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');

-- 2) Pull forward existing long-lived tokens so they conform to the new policy
UPDATE public.email_unsubscribe_tokens
  SET expires_at = LEAST(expires_at, now() + interval '48 hours')
  WHERE used_at IS NULL
    AND expires_at > now() + interval '48 hours';

-- 3) Cleanup function: purge used + expired tokens. SECURITY DEFINER so the
--    cron job can run it without needing direct table privileges.
CREATE OR REPLACE FUNCTION public.cleanup_email_unsubscribe_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.email_unsubscribe_tokens
  WHERE used_at IS NOT NULL
     OR expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 4) Ensure pg_cron is available (already enabled in this project, safe to re-run)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5) Schedule daily cleanup at 03:15 UTC. Unschedule first to make this idempotent.
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-email-unsubscribe-tokens');
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

SELECT cron.schedule(
  'cleanup-email-unsubscribe-tokens',
  '15 3 * * *',
  $$SELECT public.cleanup_email_unsubscribe_tokens();$$
);