-- Server-side accounting for the signed-in AI Lab. Chat content is never
-- stored here; the rows only reserve a small, free-tier request allowance.
CREATE TABLE IF NOT EXISTS public.ai_lab_usage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_web boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_lab_usage_events_user_time_idx
  ON public.ai_lab_usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_lab_usage_events_web_time_idx
  ON public.ai_lab_usage_events (created_at DESC) WHERE is_web;

ALTER TABLE public.ai_lab_usage_events ENABLE ROW LEVEL SECURITY;

-- Returns one of: allowed, chat_rate_limited, user_web_limit,
-- global_web_limit.  The advisory locks make check-and-insert atomic, so a
-- public UI cannot race the 400-request hard cap.
CREATE OR REPLACE FUNCTION public.reserve_ai_lab_request(
  p_user_id uuid,
  p_is_web boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_chat_count integer;
  user_web_count integer;
  global_web_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'chat_rate_limited';
  END IF;

  -- Serialize a user's requests, then serialize web reservations globally.
  PERFORM pg_advisory_xact_lock(hashtextextended('ai-lab-user:' || p_user_id::text, 0));
  IF p_is_web THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('ai-lab-web:' || CURRENT_DATE::text, 0));
  END IF;

  SELECT count(*) INTO recent_chat_count
  FROM public.ai_lab_usage_events
  WHERE user_id = p_user_id
    AND created_at >= now() - interval '10 minutes';
  IF recent_chat_count >= 10 THEN
    RETURN 'chat_rate_limited';
  END IF;

  IF p_is_web THEN
    SELECT count(*) INTO user_web_count
    FROM public.ai_lab_usage_events
    WHERE user_id = p_user_id
      AND is_web
      AND created_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC');
    IF user_web_count >= 5 THEN
      RETURN 'user_web_limit';
    END IF;

    SELECT count(*) INTO global_web_count
    FROM public.ai_lab_usage_events
    WHERE is_web
      AND created_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC');
    IF global_web_count >= 400 THEN
      RETURN 'global_web_limit';
    END IF;
  END IF;

  INSERT INTO public.ai_lab_usage_events (user_id, is_web)
  VALUES (p_user_id, p_is_web);
  RETURN 'allowed';
END;
$$;

REVOKE ALL ON public.ai_lab_usage_events FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_ai_lab_request(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_ai_lab_request(uuid, boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_lab_request(uuid, boolean) TO service_role;
