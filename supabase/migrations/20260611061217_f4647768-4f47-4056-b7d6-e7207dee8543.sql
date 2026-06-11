
-- Token vault: server-only. NO grants to anon/authenticated.
CREATE TABLE public.social_account_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  page_id text,
  ig_business_id text,
  user_access_token text,
  page_access_token text,
  token_type text DEFAULT 'long_lived',
  scopes text[],
  expires_at timestamptz,
  test_mode boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.social_account_tokens TO service_role;
ALTER TABLE public.social_account_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.social_account_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_social_account_tokens_updated
  BEFORE UPDATE ON public.social_account_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Short-lived OAuth state nonces (CSRF protection). Service-role only.
CREATE TABLE public.social_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  platform social_platform NOT NULL,
  redirect_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz
);
GRANT ALL ON public.social_oauth_states TO service_role;
ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.social_oauth_states
  FOR ALL TO service_role USING (true) WITH CHECK (true);
