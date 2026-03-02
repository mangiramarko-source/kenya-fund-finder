CREATE TABLE public.rate_limit_hits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by ip_hash and time window
CREATE INDEX idx_rate_limit_hits_ip_time ON public.rate_limit_hits (ip_hash, created_at);

-- Auto-cleanup: delete rows older than 2 minutes via a scheduled function isn't available,
-- so we'll purge inline. Enable RLS and block all public access.
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- No RLS policies = no public access. Only service role can read/write.
