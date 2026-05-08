
-- API keys for external app access
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  created_by UUID,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can read api keys"
  ON public.api_keys FOR SELECT TO public
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can update api keys"
  ON public.api_keys FOR UPDATE TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Usage log
CREATE TABLE public.api_key_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_key_usage_key_time ON public.api_key_usage(api_key_id, created_at DESC);

ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api key usage"
  ON public.api_key_usage FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert usage"
  ON public.api_key_usage FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read usage"
  ON public.api_key_usage FOR SELECT TO public
  USING (auth.role() = 'service_role');

-- Validation helper (used by edge function via service role)
CREATE OR REPLACE FUNCTION public.verify_api_key(_key_hash TEXT)
RETURNS TABLE(id UUID, name TEXT, rate_limit_per_minute INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT k.id, k.name, k.rate_limit_per_minute
  FROM public.api_keys k
  WHERE k.key_hash = _key_hash
    AND k.is_active = true
    AND (k.expires_at IS NULL OR k.expires_at > now());
$$;
